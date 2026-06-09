import api from './api';
import type {
  FactorGroup,
  GenerateScriptPayload,
  GenerateStreamEvent,
  RegenerateShotPayload,
  ReplaceFactorPayload,
  ReplaceFactorResult,
  SaveStoryboardPayload,
  Scene,
  Script,
} from '@/types';

/**
 * 剧本（Script）模块 API
 * 端点严格按《VidCraft API 接口规范文档 v1.0》第 5 章
 *
 * ⚠️ POST /scripts/generate 是 SSE 流式，不走 axios，单独用 fetch 处理。
 */
export const scriptService = {
  /** 获取剧本详情（含分镜列表） */
  get(scriptId: string): Promise<Script> {
    return api.get(`/scripts/${scriptId}`);
  },

  /**
   * 取某项目「已有的最新剧本」（进入剧本编辑页时回显，避免每次回到空态）。
   * scenes 已是前端分镜形状；项目暂无剧本时返回 null。
   * 端点 GET /api/scripts?project_id= 见后端 script.controller / API 规范 M5。
   */
  getLatestByProject(
    projectId: string,
  ): Promise<{ id: string; project_id: string; total_duration: number; scenes: Scene[] } | null> {
    return api.get('/scripts', { params: { project_id: projectId } });
  },

  /** 保存分镜编辑（顺序 / 内容 / 时长） */
  saveStoryboard(scriptId: string, payload: SaveStoryboardPayload): Promise<{ scenes: Scene[] }> {
    return api.put(`/scripts/${scriptId}/storyboard`, payload);
  },

  /** 单分镜重新生成 */
  regenerateShot(scriptId: string, payload: RegenerateShotPayload): Promise<Scene> {
    return api.post(`/scripts/${scriptId}/regenerate-shot`, payload);
  },

  /** 删除某一幕召回到的图片素材 → 返回回退默认占位图后的 scene */
  clearShotMaterial(scriptId: string, shotIndex: number): Promise<Scene> {
    return api.delete(`/scripts/${scriptId}/shots/${shotIndex}/material`);
  },

  /** 因子局部替换 —— 受影响分镜会被重生 */
  replaceFactor(scriptId: string, payload: ReplaceFactorPayload): Promise<ReplaceFactorResult> {
    return api.post(`/scripts/${scriptId}/replace-factor`, payload);
  },

  /** 获取因子库（5 个维度 + 可选值） */
  getFactors(): Promise<FactorGroup[]> {
    return api.get('/factors');
  },

  /**
   * 生成剧本（SSE 流式）
   *
   * 用法：
   *   for await (const event of scriptService.generate(payload)) {
   *     if (event.type === 'scene') ...
   *   }
   *
   * 实现：用 fetch + ReadableStream，不走 axios（拦截器对 SSE 不友好）。
   * MSW v2 也通过 ReadableStream 返回 text/event-stream，开发期能跑通。
   */
  async *generate(payload: GenerateScriptPayload): AsyncGenerator<GenerateStreamEvent> {
    const token = localStorage.getItem('vidcraft_access_token');
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
    const resp = await fetch(`${baseURL}/scripts/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(payload),
      credentials: 'include',
    });

    if (!resp.ok || !resp.body) {
      throw new Error(`Generate failed: ${resp.status}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    // SSE 协议：每条事件用空行 \n\n 分隔，每行 "field: value"
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';
      for (const chunk of chunks) {
        const dataLine = chunk.split('\n').find((l) => l.startsWith('data:'));
        if (!dataLine) continue;
        try {
          yield JSON.parse(dataLine.slice(5).trim()) as GenerateStreamEvent;
        } catch {
          // 跳过解析失败的 chunk
        }
      }
    }
  },
};

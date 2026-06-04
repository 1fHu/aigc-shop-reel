import { http, HttpResponse, delay } from 'msw';
import type { FactorGroup, FactorKey, Scene, Script } from '@/types';

/**
 * 剧本（Script）模块 Mock
 * 端点按《VidCraft API 接口规范文档 v1.0》第 5 章
 *
 * 包含：
 *   - GET  /scripts/:id
 *   - PUT  /scripts/:id/storyboard
 *   - POST /scripts/:id/regenerate-shot
 *   - POST /scripts/:id/replace-factor
 *   - POST /scripts/generate （SSE 流式）
 *   - GET  /factors
 */

// ============ 因子库 ============
const factorLibrary: FactorGroup[] = [
  { key: 'visual_style', label: '视觉风格', options: ['电影级精致', '极简主义', '高饱和', '冷峻黑白', '夏日度假风'] },
  { key: 'opener',       label: '开场手法', options: ['痛点提问', '利益点切入', '悬念诱导', '直接展示'] },
  { key: 'narration',    label: '旁白风格', options: ['冷静知性', '热情号召', '故事化', '幽默调皮'] },
  { key: 'pacing',       label: '节奏密度', options: ['慢节奏', '中节奏', '快节奏', '急速剪辑'] },
  { key: 'cta',          label: 'CTA 形式', options: ['直接报价', '限时折扣', '社交证明', '场景共鸣'] },
];

// ============ 默认 demo 剧本 ============
const defaultScenes: Scene[] = [
  {
    id: 'scene-01',
    index: 0,
    duration: 3.0,
    thumb_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=240&fit=crop',
    description: '镜头慢慢拉近，金色的灯光在杯子里旋转，光影闪烁、光影变化。',
    camera_motion: '缓推镜（Slow Zoom-in）',
    bgm: 'Modern Beat',
    voiceover: '有些光，是时候被时间的光芒，在你眼眸跳跃。',
    subtitle: '有些光，是时候被时间的光芒',
  },
  {
    id: 'scene-02',
    index: 1,
    duration: 4.0,
    thumb_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=240&fit=crop',
    description: '特写镜头近现实人物，表现皇室质感的纯白真实皮肤。',
    camera_motion: '固定镜（Static）',
    bgm: 'Cinematic',
    voiceover: '让肌肤回到最初的细腻。',
    subtitle: '让肌肤回到最初',
  },
  {
    id: 'scene-03',
    index: 2,
    duration: 3.5,
    thumb_url: 'https://images.unsplash.com/photo-1551803091-e20673f15770?w=400&h=240&fit=crop',
    description: '镜头切换到产品平面图，强调成分构成。',
    camera_motion: '跟拍（Tracking）',
    bgm: 'Modern Beat',
    voiceover: '6 大核心成分，给你看得见的改变。',
    subtitle: '6 大核心成分',
  },
  {
    id: 'scene-04',
    index: 3,
    duration: 3.0,
    thumb_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=240&fit=crop',
    description: '使用场景演示：清晨光线下涂抹精华液。',
    camera_motion: '缓推镜（Slow Zoom-in）',
    bgm: 'Energy Pop',
    voiceover: '清晨第一抹光，唤醒肌肤。',
    subtitle: '清晨唤醒肌肤',
  },
  {
    id: 'scene-05',
    index: 4,
    duration: 2.5,
    thumb_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=240&fit=crop',
    description: '产品镜头收尾 + 字幕 CTA。',
    camera_motion: '固定镜（Static）',
    bgm: 'Cinematic',
    voiceover: '现在下单，立享 5 折优惠。',
    subtitle: '5 折优惠 限时',
  },
];

const defaultScript: Script = {
  id: 'demo-script-001',
  project_id: 'proj-001',
  mode: 'reference',
  factors: {
    visual_style: '电影级精致',
    opener:       '利益点切入',
    narration:    '冷静知性',
    pacing:       '中节奏',
    cta:          '限时折扣',
  },
  scenes: [...defaultScenes],
  total_duration: defaultScenes.reduce((s, x) => s + x.duration, 0),
  version: 'v1.2.4',
  history: [
    {
      id: 'h-2',
      timestamp: new Date(Date.now() - 11 * 60_000).toISOString(),
      message: '替换 "视觉风格" → 电影级精致',
      affected_scene_ids: ['scene-01', 'scene-02'],
    },
    {
      id: 'h-1',
      timestamp: new Date(Date.now() - 22 * 60_000).toISOString(),
      message: '初始化剧本生成',
      affected_scene_ids: defaultScenes.map((s) => s.id),
    },
  ],
  created_at: new Date(Date.now() - 30 * 60_000).toISOString(),
  updated_at: new Date(Date.now() - 11 * 60_000).toISOString(),
};

// 模拟存储：scriptId → Script
const scriptsStore = new Map<string, Script>();
scriptsStore.set(defaultScript.id, defaultScript);

/** 取或懒创建剧本（任何 id 都给一份 demo） */
function getOrInitScript(id: string): Script {
  let s = scriptsStore.get(id);
  if (!s) {
    s = { ...defaultScript, id };
    scriptsStore.set(id, s);
  }
  return s;
}

// 哪些因子影响哪些分镜：粗粒度规则（视觉/开场影响 #1-#2；旁白/节奏全分镜；CTA 最后一镜）
const FACTOR_IMPACT: Record<FactorKey, (scenes: Scene[]) => string[]> = {
  visual_style: (sc) => sc.slice(0, 2).map((s) => s.id),
  opener:       (sc) => sc.slice(0, 1).map((s) => s.id),
  narration:    (sc) => sc.map((s) => s.id),
  pacing:       (sc) => sc.map((s) => s.id),
  cta:          (sc) => sc.slice(-1).map((s) => s.id),
};

export const scriptHandlers = [
  // GET /api/factors
  http.get('/api/factors', () => HttpResponse.json({
    code: 200, msg: null, total: 0, data: factorLibrary, traceId: `mock-${Date.now()}`,
  })),

  // GET /api/scripts?project_id=  —— 取项目最新剧本（进剧本编辑页回显），无则 data:null
  http.get('/api/scripts', ({ request }) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('project_id') || '';
    const latest = [...scriptsStore.values()]
      .filter((s) => s.project_id === projectId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    const data = latest
      ? { id: latest.id, project_id: latest.project_id, total_duration: latest.total_duration, scenes: latest.scenes }
      : null;
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data, traceId: `mock-${Date.now()}`,
    });
  }),

  // GET /api/scripts/:id
  http.get('/api/scripts/:id', ({ params }) => {
    const script = getOrInitScript(String(params.id));
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: script, traceId: `mock-${Date.now()}`,
    });
  }),

  // PUT /api/scripts/:id/storyboard
  http.put('/api/scripts/:id/storyboard', async ({ params, request }) => {
    const body = (await request.json()) as { storyboard: Scene[] };
    const script = getOrInitScript(String(params.id));
    script.scenes = body.storyboard;
    script.total_duration = body.storyboard.reduce((s, x) => s + x.duration, 0);
    script.updated_at = new Date().toISOString();
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: { scenes: script.scenes }, traceId: `mock-${Date.now()}`,
    });
  }),

  // POST /api/scripts/:id/regenerate-shot
  http.post('/api/scripts/:id/regenerate-shot', async ({ params, request }) => {
    await delay(1200);
    const body = (await request.json()) as { scene_id: string; hint?: string };
    const script = getOrInitScript(String(params.id));
    const target = script.scenes.find((s) => s.id === body.scene_id);
    if (!target) {
      return HttpResponse.json(
        { code: 404, msg: '分镜不存在', total: 0, data: null, traceId: `mock-${Date.now()}` },
        { status: 404 },
      );
    }
    // 模拟"重生"：略微调整 description
    target.description = (body.hint || target.description) + ' （已重生）';
    script.updated_at = new Date().toISOString();
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: target, traceId: `mock-${Date.now()}`,
    });
  }),

  // POST /api/scripts/:id/replace-factor
  http.post('/api/scripts/:id/replace-factor', async ({ params, request }) => {
    await delay(1500);
    const body = (await request.json()) as { factor: FactorKey; value: string };
    const script = getOrInitScript(String(params.id));
    script.factors[body.factor] = body.value;

    const affectedIds = FACTOR_IMPACT[body.factor](script.scenes);
    const updated_scenes = script.scenes
      .filter((s) => affectedIds.includes(s.id))
      .map((s) => ({ ...s, description: `[已应用 "${body.value}"] ${s.description.replace(/^\[已应用[^\]]+\] /, '')}` }));

    // 写回 store
    script.scenes = script.scenes.map((s) => {
      const u = updated_scenes.find((x) => x.id === s.id);
      return u || s;
    });

    const factorGroup = factorLibrary.find((g) => g.key === body.factor)!;
    const history_entry = {
      id: `h-${Date.now()}`,
      timestamp: new Date().toISOString(),
      message: `替换 "${factorGroup.label}" → ${body.value}`,
      affected_scene_ids: affectedIds,
    };
    script.history.unshift(history_entry);
    script.updated_at = new Date().toISOString();

    return HttpResponse.json({
      code: 200, msg: null, total: 0,
      data: { updated_scenes, history_entry },
      traceId: `mock-${Date.now()}`,
    });
  }),

  // POST /api/scripts/generate（SSE 流式）
  http.post('/api/scripts/generate', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { project_id?: string; mode?: string };
    const scriptId = `script-${Date.now()}`;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

        // 1) meta
        send({ type: 'meta', script_id: scriptId, total_scenes: defaultScenes.length });
        await new Promise((r) => setTimeout(r, 400));

        // 2) scenes 一条条流出来（模拟 LLM 流式输出）
        for (const s of defaultScenes) {
          send({ type: 'scene', scene: s });
          await new Promise((r) => setTimeout(r, 600));
        }

        // 3) done
        send({ type: 'done', script_id: scriptId });
        controller.close();

        // 同时把新 script 存进 store（created_at 设为当前，保证"取最新"排序正确）
        const now = new Date().toISOString();
        scriptsStore.set(scriptId, {
          ...defaultScript,
          id: scriptId,
          project_id: body.project_id || defaultScript.project_id,
          mode: (body.mode as Script['mode']) || 'reference',
          created_at: now,
          updated_at: now,
          history: [{
            id: `h-${Date.now()}`,
            timestamp: new Date().toISOString(),
            message: '初始化剧本生成',
            affected_scene_ids: defaultScenes.map((s) => s.id),
          }],
        });
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }),
];

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { MinioStorageService } from '../../common/minio-storage.service';

export type MaterialAnalysisResult = {
  analysis: Record<string, unknown>;
  tags: string[];
  embedding: string;
  duration: number | null;
};

export type ProductParseResult = {
  name: string;
  category: string;
  selling_points: string[];
  target_audience: string;
  usage_scene: string;
  price_anchor: string;
};

export type TTSWord = {
  word: string;
  startTime: number;
  endTime: number;
};

export type TTSSentence = {
  text: string;
  startTime: number;
  endTime: number;
  words: TTSWord[];
};

export type TTSResult = {
  text?: string;
  audioUrl: string;
  duration: number;
  sentences: TTSSentence[];
};

@Injectable()
export class VolcanoApiService {
  private readonly logger = new Logger(VolcanoApiService.name);
  private readonly apiKey: string;
  private readonly embedding_apiKey: string;
  private readonly doubaoEp: string;
  private readonly seedanceEp: string;
  /** 是否允许向 Seedance 传参考图（r2v）。仅 2.0 等支持 r2v 的端点可开；默认关（1.5 不传参考图） */
  private readonly seedanceR2v: boolean;
  /** 输出视频画幅比例，作为 --ratio 文本命令追加到 prompt。TikTok 竖屏默认 9:16 */
  private readonly seedanceRatio: string;
  private readonly embeddingEp: string;
  /** embedding 输出维度，必须与 DB materials.embedding 列 vector(1024) 一致 */
  private readonly embeddingDim: number;
  /** Seedream 图生图接入点（模式B 适配图）；未配则适配图生成降级，调用方回退 direct */
  private readonly seedreamEp: string;
  private readonly callbackBaseUrl: string;
  private readonly ttsAppId: string;
  private readonly ttsAccessKey: string;
  private readonly ttsApiKey: string;
  private readonly ttsResourceId: string;
  private readonly ttsVoiceId: string;

  constructor(
    private readonly config: ConfigService,
    private readonly minio: MinioStorageService,
  ) {
    this.apiKey = process.env.VOLCANO_ACCESS_KEY || this.config.get<string>('VOLCANO_ACCESS_KEY', '');
    this.embedding_apiKey = process.env.VOLCANO_EMBEDDING_API_key || this.config.get<string>('VOLCANO_EMBEDDING_API_key', '');
    this.doubaoEp = process.env.VOLCANO_DOUBAO_SEED_EP || this.config.get<string>('VOLCANO_DOUBAO_SEED_EP', '');
    this.seedanceEp = process.env.VOLCANO_SEEDANCE_EP || this.config.get<string>('VOLCANO_SEEDANCE_EP', '');
    this.seedanceR2v = (process.env.VOLCANO_SEEDANCE_R2V_ENABLED || this.config.get<string>('VOLCANO_SEEDANCE_R2V_ENABLED', '')) === 'true';
    this.seedanceRatio = '9:16';
    this.embeddingEp = process.env.VOLCANO_EMBEDDING_EP || this.config.get<string>('VOLCANO_EMBEDDING_EP', '');
    this.embeddingDim = parseInt(process.env.VOLCANO_EMBEDDING_DIM || this.config.get<string>('VOLCANO_EMBEDDING_DIM', '1024'), 10) || 1024;
    this.seedreamEp = process.env.VOLCANO_SEEDREAM_EP || this.config.get<string>('VOLCANO_SEEDREAM_EP', '');
    this.callbackBaseUrl = process.env.SEEDANCE_CALLBACK_BASE_URL || this.config.get<string>('seedance.callbackBaseUrl', '');
    this.ttsAppId = process.env.VOLCANO_TTS_APP_ID || this.config.get<string>('VOLCANO_TTS_APP_ID', '');
    this.ttsAccessKey = process.env.VOLCANO_TTS_ACCESS_KEY || this.config.get<string>('VOLCANO_TTS_ACCESS_KEY', '');
    this.ttsApiKey = process.env.VOLCANO_TTS_API_KEY || this.config.get<string>('VOLCANO_TTS_API_KEY', '');
    this.ttsResourceId = process.env.VOLCANO_TTS_RESOURCE_ID || this.config.get<string>('VOLCANO_TTS_RESOURCE_ID', 'seed-tts-2.0');
    this.ttsVoiceId = process.env.TTS_VOICE_ID || this.config.get<string>('TTS_VOICE_ID', 'zh_female_vv_uranus_bigtts');
    this.logger.log(`VolcanoApiService initialized — apiKey=${this.apiKey ? 'SET' : 'MISSING'}, doubaoEp=${this.doubaoEp || 'MISSING'}, seedanceEp=${this.seedanceEp || 'MISSING'}, seedanceR2v=${this.seedanceR2v}, seedanceRatio=${this.seedanceRatio}, embeddingEp=${this.embeddingEp || 'MISSING'}, embeddingDim=${this.embeddingDim}, seedreamEp=${this.seedreamEp || 'MISSING'}, tts=${this.isTTSConfigured() ? 'SET' : 'MISSING'}, ttsVoice=${this.ttsVoiceId}`);
  }

  signCallback(taskId: string, secret: string) {
    return Buffer.from(`${taskId}:${secret}`).toString('hex');
  }

  /** analyzeProductImage 商品主图分析逻辑*/
  async analyzeProductImage(imageName: string, imageBuffer?: Buffer): Promise<ProductParseResult> {
    this.logger.log(`analyzeProductImage: ${imageName}, buffer=${imageBuffer ? (imageBuffer.length / 1024).toFixed(0) + 'KB' : 'MISSING'}, apiKey=${this.apiKey ? 'SET' : 'MISSING'}, doubaoEp=${this.doubaoEp ? 'SET' : 'MISSING'}`);
    if (imageBuffer && this.apiKey && this.doubaoEp) {
      try {
        const result = await this.callDoubaoVision(imageBuffer);
        if (result) return result;
      } catch (err) {
        this.logger.warn(`Doubao Vision failed: ${(err as Error).message}`);
      }
    }
    return { name: imageName, category: 'other', selling_points: [], target_audience: '', usage_scene: '', price_anchor: '' };
  }

  // only used for material analysis
  private async callDoubaoVision(imageBuffer: Buffer): Promise<ProductParseResult | null> {
    const base64 = imageBuffer.toString('base64');
    const mime = this.detectMime(imageBuffer);
    this.logger.log(`Analyze product main image, image: ${(imageBuffer.length / 1024).toFixed(0)}KB, mime: ${mime}`);
    const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.doubaoEp,
        messages: [{ role: 'user', content: [
          { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
          { type: 'text', text: `分析这张商品图片，以JSON返回：{"name":"商品名","category":"品类(fashion/beauty/home/electronics/food/sports/other)","selling_points":["卖点"],"target_audience":"目标人群","usage_scene":"使用场景","price_anchor":"价格"}。只返回JSON。` },
        ]}],
        max_tokens: 400,
      }),
    });
    this.logger.log(`Doubao Vision response status: ${res.status}`);
    const data = await res.json();
    if (res.status !== 200) {
      this.logger.error(`Doubao Vision API error (${res.status}): ${JSON.stringify(data).slice(0, 500)}`);
    }
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      this.logger.warn(`Doubao Vision returned no content: ${JSON.stringify(data).slice(0, 500)}`);
      return null;
    }
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const p = JSON.parse(m[0]);
    return { name: p.name || '', category: p.category || 'other', selling_points: p.selling_points || [], target_audience: p.target_audience || '', usage_scene: p.usage_scene || '', price_anchor: p.price_anchor || '' };
  }

  /** 用 Doubao 生成商品分镜脚本 */
  async generateShotScript(productInfo: Record<string, unknown>): Promise<string[]> {
    if (!this.apiKey || !this.doubaoEp) return [];
    const infoText = JSON.stringify(productInfo, null, 2);
    try {
      const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.doubaoEp,
          messages: [{ role: 'user', content: `你是一个TikTok电商带货视频的导演。根据以下商品信息，生成5个分镜的描述（每个分镜一句话，用中文）。每个分镜描述用换行分隔，不要编号，不要其他文字。

商品信息：${infoText}

每个分镜应该覆盖：1)抓眼球的开场Hook 2)产品外观特写 3)使用场景/效果展示 4)核心卖点细节 5)行动号召CTA。` }],
          max_tokens: 400,
        }),
      });
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || '';
      return text.split('\n').filter((l: string) => l.trim());
    } catch { return []; }
  }

  /** 生成带货视频 — 调用 Seedance 1.5 Pro，支持参考图 + 首尾帧控制 */
  async generateVideo(
    prompt: string,
    imageUrls: string[] = [],
    opts?: { startImage?: string; endImage?: string },
    duration = 5,
  ): Promise<{ taskId?: string; error?: string } | null> {
    if (!this.apiKey || !this.seedanceEp) {
      this.logger.warn(`Seedance not configured (apiKey=${this.apiKey ? 'SET' : 'MISSING'}, seedanceEp=${this.seedanceEp || 'MISSING'}), using mock`);
      return { error: `Seedance 未配置（apiKey=${this.apiKey ? 'SET' : 'MISSING'}, ep=${this.seedanceEp || 'MISSING'}）` };
    }
    try {
      // Seedance 要求 content 内每个 image_url 必须带 role：
      // first_frame=首帧、last_frame=尾帧、reference_image=参考图（多参考，1.5 Pro 支持）
      const content: unknown[] = [];

      // 首尾帧控制：通过 content 内 image_url 的 role 指定，而非顶层参数
      if (opts?.startImage) {
        content.push({ type: 'image_url', image_url: { url: opts.startImage }, role: 'first_frame' });
      }
      if (opts?.endImage) {
        content.push({ type: 'image_url', image_url: { url: opts.endImage }, role: 'last_frame' });
      }

      // 参考图（reference_image）会让接口判定为 r2v 任务，仅 Seedance 2.0 等端点支持。
      // 由 VOLCANO_SEEDANCE_R2V_ENABLED 开关控制，默认关：1.5 端点下不传参考图（走纯文生/首尾帧），
      // 否则会报 "task_type r2v does not support model ..."。
      let refsSent = 0;
      if (this.seedanceR2v) {
        for (const url of imageUrls) {
          if (url && !url.includes('placehold.co')) {
            content.push({ type: 'image_url', image_url: { url }, role: 'reference_image' });
            refsSent += 1;
          }
        }
      }
      content.push({ type: 'text', text: prompt });

      const body: Record<string, unknown> = { model: this.seedanceEp, content, ratio: this.seedanceRatio, duration: Math.round(duration) };
      if (this.callbackBaseUrl) {
        body.callback_url = `${this.callbackBaseUrl}/api/volcano/seedance-callback`;
      }

      const hasFrameControl = !!(opts?.startImage || opts?.endImage);
      // [DEBUG] 提交前完整打印请求结构：模型、各 content 的 role、prompt 长度与预览、请求体大小
      const roleSummary = content.map((c: any) => c?.role || c?.type).join(',');
      const bodyJson = JSON.stringify(body);
      this.logger.log(
        `[Seedance][submit] model=${this.seedanceEp} contentRoles=[${roleSummary}] ` +
        `refs=${refsSent}/${imageUrls.length} (r2v=${this.seedanceR2v}) ` +
        `startFrame=${!!opts?.startImage} endFrame=${!!opts?.endImage} ` +
        `promptLen=${prompt.length} bodyBytes=${bodyJson.length}`,
      );
      this.logger.debug(`[Seedance][submit] prompt="${prompt.slice(0, 300)}${prompt.length > 300 ? '…' : ''}"`);

      const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: bodyJson,
      });
      const data = await res.json();
      this.logger.log(`[Seedance][submit] HTTP ${res.status} resp=${JSON.stringify(data).slice(0, 600)}`);
      if (res.status !== 200) {
        // 真实失败原因（含火山返回的 error.code / error.message），交回上层落库到 task.error_msg
        const apiMsg = data?.error?.message || data?.message || JSON.stringify(data).slice(0, 300);
        const apiCode = data?.error?.code || data?.code || '';
        this.logger.error(`[Seedance][submit] API error (${res.status})${apiCode ? ` code=${apiCode}` : ''}: ${apiMsg}`);
        return { error: `Seedance ${res.status}${apiCode ? `/${apiCode}` : ''}: ${apiMsg}` };
      }
      const taskId = data?.id || data?.task_id;
      if (taskId) {
        this.logger.log(`[Seedance][submit] task created: ${taskId}`);
        return { taskId };
      }
      this.logger.warn(`[Seedance][submit] no task ID in response: ${JSON.stringify(data).slice(0, 300)}`);
      return { error: `Seedance 返回无 taskId: ${JSON.stringify(data).slice(0, 200)}` };
    } catch (err) {
      this.logger.error(`[Seedance][submit] exception: ${(err as Error).message}`, (err as Error).stack);
      return { error: `Seedance 异常: ${(err as Error).message}` };
    }
  }

  /** 查询 Seedance 任务状态 */
  async getVideoTaskStatus(taskId: string): Promise<{ status: string; videoUrl?: string; error?: string } | null> {
    try {
      const res = await fetch(`https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      const data = await res.json();
      const status = data?.status || 'running';
      const videoUrl = data?.output?.video_url || data?.content?.video_url;
      // [DEBUG] 任务进入终态（失败/成功）时打印火山返回的完整原因
      if (status === 'failed' || res.status !== 200) {
        const apiMsg = data?.error?.message || data?.message || JSON.stringify(data).slice(0, 300);
        this.logger.error(`[Seedance][poll] task ${taskId} status=${status} HTTP=${res.status}: ${apiMsg}`);
        return { status: 'failed', videoUrl, error: `Seedance task ${status}: ${apiMsg}` };
      }
      this.logger.debug(`[Seedance][poll] task ${taskId} status=${status}${videoUrl ? ' (videoUrl ready)' : ''}`);
      return { status, videoUrl };
    } catch (err) {
      // Node fetch 的真实原因藏在 err.cause（ECONNRESET / ETIMEDOUT / ENOTFOUND 等），单独打出来
      const cause = (err as any)?.cause;
      const causeStr = cause ? ` cause=${cause.code || cause.errno || cause.message || cause}` : '';
      this.logger.warn(`[Seedance][poll] task ${taskId} fetch error: ${(err as Error).message}${causeStr}`);
      return null;
    }
  }

  detectMime(buf: Buffer): string {
    if (buf[0] === 0xFF && buf[1] === 0xD8) return 'image/jpeg';
    if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
    if (buf[0] === 0x52 && buf[1] === 0x49) return 'image/webp';
    return 'image/jpeg';
  }

  /**
   * 多模态 Embedding（火山方舟 doubao-embedding-vision）——文本 + 图片融合成一条向量，
   * 返回 pgvector 可写的 JSON 字符串（如 "[0.1,...]"）。商品主图与素材分析共用本函数，
   * 保证两类素材落在同一向量空间、可互相检索。
   *
   * 走 /embeddings/multimodal 端点：input 是结构化数组（{type:'text'} / {type:'image_url'}），
   * 与纯文本 /embeddings（input:[字符串]）不同。图片优先用 base64 data URL，避免 dev 下
   * 火山访问不到 localhost 的 MinIO。未配置 / 失败 / 维度不符时返回 null（调用方据此存 NULL）。
   */
  async generateEmbedding(input: { text?: string; imageBuffer?: Buffer; imageUrl?: string }): Promise<string | null> {
    const key = this.embedding_apiKey || this.apiKey;
    // 未配置 Key / 接入点：直接跳过（留 NULL），不打无效请求。配置项见 .env 的 VOLCANO_EMBEDDING_EP
    if (!key || !this.embeddingEp) {
      if (!this.embeddingEp) this.logger.warn('VOLCANO_EMBEDDING_EP 未配置，跳过 embedding 生成（向量检索不可用）');
      return null;
    }

    // 组多模态 input：文本 + 图片（二者皆可选，但至少要有一个）
    const content: Array<Record<string, unknown>> = [];
    if (input.text && input.text.trim()) content.push({ type: 'text', text: input.text.trim() });
    if (input.imageBuffer) {
      const mime = this.detectMime(input.imageBuffer);
      content.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${input.imageBuffer.toString('base64')}` } });
    } else if (input.imageUrl) {
      content.push({ type: 'image_url', image_url: { url: input.imageUrl } });
    }
    if (content.length === 0) return null;

    try {
      const embedRes = await fetch('https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        // dimensions 把输出降到 DB vector(1024)（doubao-embedding-vision 支持降维保兼容）
        body: JSON.stringify({ model: this.embeddingEp, input: content, encoding_format: 'float', dimensions: this.embeddingDim }),
      });
      const embedData = await embedRes.json();
      // 多模态返回单条 data.embedding（对象）；兼容纯文本端点的 data[0].embedding（数组）
      const vec = embedData?.data?.embedding ?? embedData?.data?.[0]?.embedding;
      if (!vec || !Array.isArray(vec) || vec.length === 0) {
        // 拿不到向量（端点无效 / 返回错误体）：不抛错，留 NULL，这里打日志暴露原因
        this.logger.warn(`Embedding empty (ep=${this.embeddingEp}): ${JSON.stringify(embedData).slice(0, 300)}`);
        return null;
      }
      // 维度不匹配会让 pgvector 写入直接报错（进而把素材置 failed），这里提前拦下留 NULL
      if (vec.length !== this.embeddingDim) {
        this.logger.error(`Embedding 维度不匹配：模型返回 ${vec.length} 维，DB 列要求 ${this.embeddingDim} 维。请改 VOLCANO_EMBEDDING_DIM 或更换接入点/调整 DB 列后重建索引。`);
        return null;
      }
      const hasImage = !!(input.imageBuffer || input.imageUrl);
      this.logger.log(`Embedding 生成成功：${vec.length} 维（图片=${hasImage ? '有' : '无'}）预览=[${(vec as number[]).slice(0, 4).map((n) => n.toFixed(4)).join(', ')}, ...]`);
      return JSON.stringify(vec);
    } catch (err) {
      this.logger.warn(`Embedding failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * 模式B 图生图（Doubao Seedream）：把原素材图按本幕剧本改造成该幕适配首帧。
   * - 原图优先内联成 base64 data URI（绕开公网可达性，与 prepareReferenceImages 同思路）；
   * - 走 Ark images/generations，取 b64_json/url，解码后**重新落 MinIO** 返回我方持久 URL
   *   （Seedream 临时 URL 会过期，且 Seedance 云端需公网可拉取首帧）；
   * - 未配置 VOLCANO_SEEDREAM_EP 或任一步失败 → 返回 null，调用方降级为 direct（用原素材图）。
   */
  async adaptShotImage(input: {
    baseImageUrl?: string;
    baseImageBuffer?: Buffer;
    prompt: string;
    size?: string;
  }): Promise<string | null> {
    if (!this.apiKey || !this.seedreamEp) {
      if (!this.seedreamEp) this.logger.warn('VOLCANO_SEEDREAM_EP 未配置，跳过适配图生成（模式B降级为 direct）');
      return null;
    }

    // 原图 → data URI（拿不到 buffer 时退回直接透传 URL）
    let imageRef: string | null = null;
    try {
      let buf = input.baseImageBuffer ?? null;
      if (!buf && input.baseImageUrl) buf = await this.minio.downloadFile(input.baseImageUrl);
      if (buf?.length) {
        const mime = this.detectMime(buf);
        imageRef = `data:${mime};base64,${buf.toString('base64')}`;
      } else if (input.baseImageUrl) {
        imageRef = input.baseImageUrl;
      }
    } catch {
      imageRef = input.baseImageUrl ?? null;
    }
    if (!imageRef) return null;

    try {
      const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.seedreamEp,
          prompt: input.prompt,
          image: imageRef,                 // 图生图/编辑：传原图
          size: input.size || '720x1280',  // 竖屏 9:16，具体枚举以控制台接入点为准
          response_format: 'b64_json',
          watermark: false,
        }),
      });
      const data = await res.json();
      const item = data?.data?.[0];
      let outBuf: Buffer | null = null;
      if (item?.b64_json) {
        outBuf = Buffer.from(item.b64_json as string, 'base64');
      } else if (item?.url) {
        const r = await fetch(item.url as string);
        outBuf = Buffer.from(await r.arrayBuffer());
      }
      if (!outBuf?.length) {
        this.logger.warn(`Seedream 适配图返回空 (ep=${this.seedreamEp}): ${JSON.stringify(data).slice(0, 300)}`);
        return null;
      }
      const key = `adapted/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      const savedUrl = await this.minio.uploadFile(key, outBuf, 'image/png');
      this.logger.log(`Seedream 适配图生成成功 → ${savedUrl}`);
      return savedUrl;
    } catch (err) {
      this.logger.warn(`Seedream 适配图生成失败: ${(err as Error).message}`);
      return null;
    }
  }

  /** Analyze uploaded material — Doubao Vision for tags + Embedding for vector */
  async analyzeMaterial(input: { fileType: 'image' | 'video'; fileName: string; buffer: Buffer }): Promise<MaterialAnalysisResult> {
    this.logger.log(`analyzeMaterial: ${input.fileName} (${input.fileType})`);
    if (!this.apiKey || !this.doubaoEp) {
      this.logger.warn('Volcano API not configured, returning empty analysis');
      return { analysis: {}, tags: [], embedding: '[]', duration: null };
    }

    try {
      const base64 = input.buffer.toString('base64');
      const mime = this.detectMime(input.buffer);

      // Step 1: Doubao Vision analysis
      const visionRes = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.doubaoEp,
          messages: [{ role: 'user', content: [
            { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
            { type: 'text', text: '分析这张商品素材图片，以JSON返回：{"summary":"图片主要内容，8个字以内，概括画面在表达什么（如：随心组网、轻薄机身、户外实拍）","tags":["标签1","标签2","标签3"],"description":"一句话描述素材内容","quality":"画质评估(high/medium/low)","suitable_for":"适用场景"}。只返回JSON。' },
          ]}],
          max_tokens: 300,
        }),
      });
      const visionData = await visionRes.json();
      const content = visionData?.choices?.[0]?.message?.content || '';
      let analysis: Record<string, unknown> = {};
      let tags: string[] = [];
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          const parsed = JSON.parse(m[0]);
          analysis = parsed;
          tags = Array.isArray(parsed.tags) ? parsed.tags : [];
        } catch {
          this.logger.warn(`Failed to parse vision response: ${content}`);
        }
      }

      // Step 2: 多模态 Embedding（图片 + 文本摘要融合；与商品主图共用 generateEmbedding，空向量回退 '[]'）
      const embedText = JSON.stringify({ name: input.fileName, ...analysis });
      const embedding = (await this.generateEmbedding({ text: embedText, imageBuffer: input.buffer })) ?? '[]';

      return { analysis, tags, embedding, duration: null };
    } catch (err) {
      this.logger.error(`analyzeMaterial error: ${(err as Error).message}`);
      throw err;
    }
  }

  // ---- TTS (豆包语音) ----

  /** 检查 TTS 是否已配置 */
  isTTSConfigured(): boolean {
    // 新版 API Key 或 旧版 AppId+AccessKey 任一组合可用即视为已配置
    return !!(this.ttsApiKey) || !!(this.ttsAppId && this.ttsAccessKey);
  }

  /** 语音合成：HTTP SSE 单向流式，一次请求拿到全部音频 + 字幕。TTS 未配置时返回 null */
  async synthesizeSpeech(text: string, voiceId?: string): Promise<TTSResult | null> {
    if (!this.isTTSConfigured()) {
      this.logger.warn('TTS not configured, skipping synthesizeSpeech');
      return null;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Api-Resource-Id': this.ttsResourceId,
      'X-Api-Request-Id': randomUUID(),
    };
    if (this.ttsApiKey) {
      headers['X-Api-Key'] = this.ttsApiKey;
    } else {
      headers['X-Api-App-Id'] = this.ttsAppId;
      headers['X-Api-Access-Key'] = this.ttsAccessKey;
    }

    const speaker = voiceId || this.ttsVoiceId;
    this.logger.log(`[TTS SSE] Starting for "${text.slice(0, 30)}...", speaker=${speaker}`);

    try {
      const res = await fetch('https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user: { uid: 'vidcraft' },
          namespace: 'BidirectionalTTS',
          req_params: {
            text,
            speaker,
            audio_params: {
              format: 'mp3',
              sample_rate: 24000,
              enable_subtitle: true,
            },
          },
        }),
      });

      if (!res.ok || !res.body) {
        this.logger.warn(`[TTS SSE] HTTP ${res.status}`);
        return null;
      }

      // 流式解析 SSE
      const chunks: Buffer[] = [];
      const sentences: TTSSentence[] = [];
      const reader = (res.body as ReadableStream<Uint8Array>).getReader();

      let buffer = '';
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = this.parseSSEEvents(buffer);
        buffer = events.remainder;
        for (const ev of events.parsed) {
          this.processSSEEvent(ev, chunks, sentences);
        }
      }

      if (!chunks.length) {
        this.logger.warn('[TTS SSE] No audio received');
        return null;
      }

      const normalizedSentences = this.normalizeTTSSentences(sentences);
      const audioBuffer = Buffer.concat(chunks);
      const duration = normalizedSentences.length > 0
        ? (normalizedSentences.at(-1)!.words.at(-1)?.endTime ?? normalizedSentences.at(-1)!.endTime) ?? 3
        : 3;

      // Upload to MinIO
      const objectName = `tts/${randomUUID()}.mp3`;
      const audioUrl = await this.minio.uploadFile(objectName, audioBuffer, 'audio/mpeg');

      this.logger.log(`[TTS SSE] Done: ${(duration).toFixed(1)}s, ${sentences.length} sentences, ${(audioBuffer.length / 1024).toFixed(0)}KB`);
      return { text, audioUrl, duration, sentences: normalizedSentences };
    } catch (err) {
      this.logger.warn(`[TTS SSE] Error: ${(err as Error).message}`);
      return null;
    }
  }

  /** 解析 SSE 文本流，提取完整 event */
  private parseSSEEvents(buffer: string): { parsed: Array<{ event: string; data: string }>; remainder: string } {
    const parsed: Array<{ event: string; data: string }> = [];
    const parts = buffer.split('\n\n');
    // 最后一段可能不完整，留在 remainder
    const remainder = parts.pop() || '';
    let currentEvent = '';
    for (const part of parts) {
      if (!part.trim()) continue;
      for (const line of part.split('\n')) {
        if (line.startsWith('event: ')) { currentEvent = line.slice(7).trim(); }
      }
      const dataLine = part.split('\n').find((l) => l.startsWith('data: '));
      if (dataLine) {
        parsed.push({ event: currentEvent || '0', data: dataLine.slice(6) });
      }
    }
    return { parsed, remainder };
  }

  /** 处理单个 SSE event */
  private processSSEEvent(ev: { event: string; data: string }, audioChunks: Buffer[], sentences: TTSSentence[]) {
    try {
      const json = JSON.parse(ev.data);
      // 音频 base64 数据（event 352 = TTSResponse）
      if (json.data && typeof json.data === 'string' && json.data.length > 100) {
        audioChunks.push(Buffer.from(json.data, 'base64'));
      } else if (typeof json.audio === 'string' && json.audio.length > 100) {
        audioChunks.push(Buffer.from(json.audio, 'base64'));
      } else if (typeof json.data?.audio === 'string' && json.data.audio.length > 100) {
        audioChunks.push(Buffer.from(json.data.audio, 'base64'));
      }
      // 句/词级时间戳：event 351 (TTSSentenceEnd) 或 TTSSubtitle（TTS 2.0 下 event ID 可能不同）
      // TTS 2.0 enable_subtitle 会多次返回 TTSSubtitle 事件，携带原文打轴的 words
      const extracted = this.extractSubtitleSentences(json);
      if (extracted.length > 0) {
        for (const s of extracted) sentences.push(s);
        this.logger.debug(`[TTS SSE] subtitle event=${ev.event}: ${extracted.reduce((n, s) => n + s.words.length, 0)} words`);
      }
      // event 153 (SessionFailed): 报错
      if (ev.event === '153') {
        this.logger.warn(`[TTS SSE] SessionFailed: ${ev.data.slice(0, 200)}`);
      }
    } catch { /* skip malformed SSE data */ }
  }

  private extractSubtitleSentences(payload: any): TTSSentence[] {
    const toNumber = (value: any) => (typeof value === 'number' ? value : Number(value || 0));
    const toWord = (w: any): TTSWord => ({
      word: (w?.word ?? '').toString(),
      startTime: toNumber(w?.startTime ?? w?.start_time ?? 0),
      endTime: toNumber(w?.endTime ?? w?.end_time ?? 0),
    });
    const toSentence = (s: any): TTSSentence | null => {
      if (!s) return null;
      const words = Array.isArray(s.words) ? s.words.map(toWord) : [];
      return {
        text: (s.text ?? s.sentence ?? '').toString(),
        startTime: toNumber(s.startTime ?? s.start_time ?? words[0]?.startTime ?? 0),
        endTime: toNumber(s.endTime ?? s.end_time ?? words.at(-1)?.endTime ?? 0),
        words,
      };
    };

    const results: TTSSentence[] = [];
    const candidates = [
      payload?.sentence,
      payload?.subtitle,
      payload?.subtitles,
      payload?.data?.sentence,
      payload?.data?.subtitle,
      payload?.data?.subtitles,
      payload?.result?.subtitle,
      payload?.result?.subtitles,
      payload?.data?.result?.subtitle,
      payload?.data?.result?.subtitles,
    ];

    for (const c of candidates) {
      if (!c) continue;
      if (Array.isArray(c)) {
        for (const item of c) {
          if (Array.isArray(item?.sentences)) {
            for (const s of item.sentences) {
              const sentence = toSentence(s);
              if (sentence) results.push(sentence);
            }
          } else {
            const sentence = toSentence(item);
            if (sentence) results.push(sentence);
          }
        }
      } else if (Array.isArray(c.sentences)) {
        for (const s of c.sentences) {
          const sentence = toSentence(s);
          if (sentence) results.push(sentence);
        }
      } else {
        const sentence = toSentence(c);
        if (sentence) results.push(sentence);
      }
    }

    return results.filter((s) => s.words.length > 0 || s.text.length > 0);
  }

  private normalizeTTSSentences(sentences: TTSSentence[]): TTSSentence[] {
    if (sentences.length === 0) return [];
    const maxTime = sentences.reduce((max, s) => {
      const sentenceEnd = s.endTime || 0;
      const wordEnd = s.words.at(-1)?.endTime || 0;
      return Math.max(max, sentenceEnd, wordEnd);
    }, 0);
    const scale = maxTime > 1000 ? 0.001 : 1;
    return sentences.map((s) => {
      const rawWords = (s.words || []).map((w) => ({
        word: w.word || '',
        startTime: Number(w.startTime || 0),
        endTime: Number(w.endTime || 0),
      }));
      const words = rawWords.map((w) => ({
        word: w.word,
        startTime: w.startTime * scale,
        endTime: w.endTime * scale,
      }));
      const startTimeRaw = Number(s.startTime || rawWords[0]?.startTime || 0);
      const endTimeRaw = Number(s.endTime || rawWords.at(-1)?.endTime || startTimeRaw);
      return {
        text: s.text || '',
        startTime: startTimeRaw * scale,
        endTime: endTimeRaw * scale,
        words,
      };
    });
  }
}

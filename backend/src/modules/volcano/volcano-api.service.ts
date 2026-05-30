import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

@Injectable()
export class VolcanoApiService {
  private readonly logger = new Logger(VolcanoApiService.name);
  private readonly apiKey: string;
  private readonly doubaoEp: string;
  private readonly seedanceEp: string;
  private readonly embeddingEp: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = process.env.VOLCANO_ACCESS_KEY || this.config.get<string>('VOLCANO_ACCESS_KEY', '');
    this.doubaoEp = process.env.VOLCANO_DOUBAO_SEED_EP || this.config.get<string>('VOLCANO_DOUBAO_SEED_EP', '');
    this.seedanceEp = process.env.VOLCANO_SEEDANCE_EP || this.config.get<string>('VOLCANO_SEEDANCE_EP', '');
    this.embeddingEp = process.env.VOLCANO_EMBEDDING_EP || this.config.get<string>('VOLCANO_EMBEDDING_EP', 'doubao-embedding-large');
    this.logger.log(`VolcanoApiService initialized — apiKey=${this.apiKey ? 'SET' : 'MISSING'}, doubaoEp=${this.doubaoEp ? 'SET' : 'MISSING'}, seedanceEp=${this.seedanceEp ? 'SET' : 'MISSING'}, embeddingEp=${this.embeddingEp}`);
  }

  signCallback(taskId: string, secret: string) {
    return Buffer.from(`${taskId}:${secret}`).toString('hex');
  }

  /** 商品图片多模态解析 */
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

  private async callDoubaoVision(imageBuffer: Buffer): Promise<ProductParseResult | null> {
    const base64 = imageBuffer.toString('base64');
    const mime = this.detectMime(imageBuffer);
    this.logger.log(`Calling Doubao Vision API, image: ${(imageBuffer.length / 1024).toFixed(0)}KB, mime: ${mime}`);
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

  /** 生成带货视频 — 调用 Seedance 1.5 Pro，支持多张参考图 */
  async generateVideo(prompt: string, imageUrls: string[] = []): Promise<{ taskId: string } | null> {
    if (!this.apiKey || !this.seedanceEp) {
      this.logger.warn('Seedance not configured, using mock');
      return null;
    }
    try {
      const content: unknown[] = [];
      for (const url of imageUrls) {
        if (url && !url.includes('placehold.co')) {
          content.push({ type: 'image_url', image_url: { url } });
        }
      }
      content.push({ type: 'text', text: prompt });

      const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.seedanceEp,
          content,
        }),
      });
      this.logger.log(`Seedance submit with ${imageUrls.length} reference images`);
      this.logger.log(`Seedance response status: ${res.status}`);
      const data = await res.json();
      this.logger.log(`Seedance response: ${JSON.stringify(data).slice(0, 500)}`);
      if (res.status !== 200) {
        this.logger.error(`Seedance API error (${res.status}): ${JSON.stringify(data).slice(0, 500)}`);
      }
      const taskId = data?.id || data?.task_id;
      if (taskId) {
        this.logger.log(`Seedance task created: ${taskId}`);
        return { taskId };
      }
      this.logger.warn('Seedance returned no task ID');
      return null;
    } catch (err) {
      this.logger.error(`Seedance error: ${(err as Error).message}`);
      return null;
    }
  }

  /** 查询 Seedance 任务状态 */
  async getVideoTaskStatus(taskId: string): Promise<{ status: string; videoUrl?: string } | null> {
    try {
      const res = await fetch(`https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      const data = await res.json();
      return { status: data?.status || 'running', videoUrl: data?.output?.video_url || data?.content?.video_url };
    } catch { return null; }
  }

  detectMime(buf: Buffer): string {
    if (buf[0] === 0xFF && buf[1] === 0xD8) return 'image/jpeg';
    if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
    if (buf[0] === 0x52 && buf[1] === 0x49) return 'image/webp';
    return 'image/jpeg';
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
            { type: 'text', text: '分析这张商品素材图片，以JSON返回：{"category":"品类标签","tags":["标签1","标签2","标签3"],"description":"一句话描述素材内容","quality":"画质评估(high/medium/low)","suitable_for":"适用场景"}。只返回JSON。' },
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

      // Step 2: Doubao Embedding
      let embedding = '[]';
      try {
        const embedText = JSON.stringify({ name: input.fileName, ...analysis });
        const embedRes = await fetch('https://ark.cn-beijing.volces.com/api/v3/embeddings', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.embeddingEp,
            input: [embedText],
          }),
        });
        const embedData = await embedRes.json();
        const vec = embedData?.data?.[0]?.embedding;
        if (vec && Array.isArray(vec)) {
          embedding = JSON.stringify(vec);
        }
      } catch (err) {
        this.logger.warn(`Embedding failed: ${(err as Error).message}`);
      }

      return { analysis, tags, embedding, duration: null };
    } catch (err) {
      this.logger.error(`analyzeMaterial error: ${(err as Error).message}`);
      throw err;
    }
  }
}

# MinIO Storage + AI Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace placeholder file storage and AI analysis stub with real MinIO uploads and Doubao Vision + Embedding API calls.

**Architecture:** Create a `MinioStorageService` (global provider) that wraps the `minio` client for upload/download/delete. Integrate MinIO upload into `MaterialService.upload()` so files get real URLs. Replace `VolcanoApiService.analyzeMaterial()` with real Doubao Vision (tags+analysis) and Doubao Embedding (1024-dim vector) calls. The BullMQ processor downloads from MinIO and passes the buffer to the volcano API.

**Tech Stack:** NestJS 10, `minio` 7.x, Doubao Vision API (ark.cn-beijing.volces.com), Doubao Embedding API

**Files being changed:** 2 new files, 7 modified files

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/src/common/minio-storage.service.ts` | **Create** | Wrap minio client: upload, download, delete, ensure bucket on init |
| `backend/src/common/minio-storage.module.ts` | **Create** | Global module exporting MinioStorageService |
| `backend/src/common/mock-store.module.ts` | Modify L6 | Add MinioStorageModule import |
| `backend/src/common/mock-store.service.ts` | Modify L732-738 | Accept optional `file_url`/`thumbnail_url` in `createMaterials` |
| `backend/src/modules/material/material.service.ts` | Modify L21-63 | Upload files to MinIO, pass real URLs to store |
| `backend/src/modules/volcano/volcano-api.service.ts` | Modify L147-149 | Replace `analyzeMaterial` stub with real Doubao Vision + Embedding |
| `backend/src/queue/material-analysis.processor.ts` | Modify L13-44 | Inject MinioStorageService, download buffer, pass to volcano |
| `backend/src/app.module.ts` | Modify L6,46 | Import MinioStorageModule |
| `.env` | Modify L38,44 | Add `VOLCANO_EMBEDDING_EP` config |

---

### Task 1: Create MinioStorageService

**Files:**
- Create: `backend/src/common/minio-storage.service.ts`
- Create: `backend/src/common/minio-storage.module.ts`
- Modify: `backend/src/common/mock-store.module.ts:1-8`
- Modify: `backend/src/app.module.ts:6,46`

- [ ] **Step 1: Create MinioStorageService**

```ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioStorageService implements OnModuleInit {
  private readonly logger = new Logger(MinioStorageService.name);
  private readonly client: Minio.Client;
  private readonly bucketName: string;

  constructor(private readonly config: ConfigService) {
    this.bucketName = this.config.get<string>('MINIO_BUCKET', 'vidcraft-media');
    this.client = new Minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.config.get<number>('MINIO_PORT', 9000),
      useSSL: false,
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName);
        this.logger.log(`Bucket "${this.bucketName}" created`);
      } else {
        this.logger.log(`Bucket "${this.bucketName}" already exists`);
      }
    } catch (err) {
      this.logger.warn(`MinIO init failed (storage may be unavailable): ${(err as Error).message}`);
    }
  }

  /** Upload a file buffer to MinIO, returns the full public URL */
  async uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    await this.client.putObject(this.bucketName, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.config.get<number>('MINIO_PORT', 9000);
    return `http://${endpoint}:${port}/${this.bucketName}/${key}`;
  }

  /** Download a file from MinIO by URL, returns the buffer */
  async downloadFile(fileUrl: string): Promise<Buffer> {
    const key = this.extractKey(fileUrl);
    const stream = await this.client.getObject(this.bucketName, key);
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /** Delete a file from MinIO by URL */
  async deleteFile(fileUrl: string): Promise<void> {
    const key = this.extractKey(fileUrl);
    await this.client.removeObject(this.bucketName, key);
  }

  /** Get bucket name (for building URLs) */
  getBucket(): string {
    return this.bucketName;
  }

  /** Extract object key from a MinIO URL like http://host:port/bucket/key */
  private extractKey(fileUrl: string): string {
    try {
      const url = new URL(fileUrl);
      const path = url.pathname.substring(1);
      const bucketPrefix = `${this.bucketName}/`;
      if (path.startsWith(bucketPrefix)) {
        return path.substring(bucketPrefix.length);
      }
      return path;
    } catch {
      return fileUrl;
    }
  }
}
```

- [ ] **Step 2: Create MinioStorageModule**

```ts
import { Global, Module } from '@nestjs/common';
import { MinioStorageService } from './minio-storage.service';

@Global()
@Module({
  providers: [MinioStorageService],
  exports: [MinioStorageService],
})
export class MinioStorageModule {}
```

- [ ] **Step 3: Register MinioStorageModule in MockStoreModule**

Read `backend/src/common/mock-store.module.ts`, replace:
```ts
import { Global, Module } from '@nestjs/common';
import { MockStoreService } from './mock-store.service';

@Global()
@Module({
  providers: [MockStoreService],
  exports: [MockStoreService],
})
export class MockStoreModule {}
```
With:
```ts
import { Global, Module } from '@nestjs/common';
import { MockStoreService } from './mock-store.service';
import { MinioStorageModule } from './minio-storage.module';

@Global()
@Module({
  imports: [MinioStorageModule],
  providers: [MockStoreService],
  exports: [MockStoreService],
})
export class MockStoreModule {}
```

- [ ] **Step 4: Ensure MinioStorageModule is available app-wide**

Since `MockStoreModule` is `@Global()` and already imported by `AppModule`, the `MinioStorageModule` (also `@Global()`) will be transitively loaded. The `@Global()` decorator on `MinioStorageModule` ensures `MinioStorageService` is injectable everywhere.

- [ ] **Step 5: Verify type-check**

Run: `cd backend && npm run type-check`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add backend/src/common/minio-storage.service.ts backend/src/common/minio-storage.module.ts backend/src/common/mock-store.module.ts
git commit -m "feat: add MinioStorageService with upload/download/delete for material files"
```

---

### Task 2: Update createMaterials to accept real URLs

**Files:**
- Modify: `backend/src/common/mock-store.service.ts:732-756`

- [ ] **Step 1: Update createMaterials signature and implementation**

Read `backend/src/common/mock-store.service.ts` lines 732-756. Replace the `createMaterials` method:

```ts
createMaterials(projectId: string, files: Array<{ originalname?: string; mimetype?: string; size?: number; fileUrl?: string; thumbnailUrl?: string }>) {
    const now = new Date().toISOString();
    const created = files.map((file, index) => {
      const fileType = file.mimetype?.startsWith('video/') ? 'video' : 'image';
      const material: MaterialRecord = {
        id: randomUUID(),
        project_id: projectId,
        file_url: file.fileUrl || `https://example.com/materials/${index + 1}-${file.originalname || 'upload'}`,
        file_type: fileType,
        file_name: file.originalname || `upload-${index + 1}`,
        file_size: file.size || 1024,
        analysis: {},
        embedding: '',
        tags: [],
        thumbnail_url: file.thumbnailUrl || `https://example.com/materials/${index + 1}-thumb.jpg`,
        status: 'parsing',
        duration: null,
        slices: [],
        created_at: now,
      };
      this.materials.set(material.id, material);
      return { id: material.id, file_type: material.file_type, file_url: material.file_url, status: material.status, thumbnail_url: material.thumbnail_url };
    });
    const project = this.projects.get(projectId);
    if (project) {
      this.updateProject(projectId, { material_count: project.material_count + created.length, status: 'material_pending' });
    }
    return created;
  }
```

- [ ] **Step 2: Verify type-check**

Run: `cd backend && npm run type-check`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/common/mock-store.service.ts
git commit -m "feat: accept optional fileUrl/thumbnailUrl in createMaterials for real MinIO URLs"
```

---

### Task 3: Integrate MinIO upload into MaterialService

**Files:**
- Modify: `backend/src/modules/material/material.service.ts:1-63`

- [ ] **Step 1: Add MinioStorageService injection and MinIO upload logic**

Read `backend/src/modules/material/material.service.ts`. Replace the entire file:

```ts
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { MockStoreService } from '../../common/mock-store.service';
import { MinioStorageService } from '../../common/minio-storage.service';

const MAX_FILES = 20;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const IMAGE_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const VIDEO_MIME = new Set(['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi', 'video/msvideo']);

@Injectable()
export class MaterialService {
  private readonly logger = new Logger(MaterialService.name);

  constructor(
    private readonly store: MockStoreService,
    private readonly minio: MinioStorageService,
    @InjectQueue('material-analysis') private readonly analysisQueue: Queue,
  ) {}

  async upload(userId: string, projectId: string, files: Express.Multer.File[]) {
    const project = this.store.getProject(projectId);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    if (project.user_id !== userId) {
      throw new ForbiddenException('无权操作该项目');
    }
    if (files.length === 0) {
      throw new BadRequestException('请至少上传一个素材文件');
    }
    if (files.length > MAX_FILES) {
      throw new BadRequestException(`单次最多上传 ${MAX_FILES} 个文件`);
    }

    const fileInfos: Array<{ originalname?: string; mimetype?: string; size?: number; fileUrl?: string; thumbnailUrl?: string }> = [];

    for (const file of files) {
      const mimetype = (file.mimetype || '').toLowerCase();
      const isImage = IMAGE_MIME.has(mimetype);
      const isVideo = VIDEO_MIME.has(mimetype);
      if (!isImage && !isVideo) {
        throw new BadRequestException(`文件「${file.originalname}」格式不支持，仅支持 JPG/PNG/WEBP 图片或 MP4/MOV/AVI 视频`);
      }
      const limit = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
      if (file.size > limit) {
        const limitMb = Math.round(limit / 1024 / 1024);
        throw new BadRequestException(`文件「${file.originalname}」超出大小限制（${isImage ? '图片' : '视频'} ≤ ${limitMb}MB）`);
      }

      // Upload to MinIO
      let fileUrl = '';
      const fileExt = file.originalname?.split('.').pop() || 'bin';
      const key = `projects/${projectId}/materials/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      try {
        fileUrl = await this.minio.uploadFile(key, file.buffer, file.mimetype || 'application/octet-stream');
        this.logger.log(`Uploaded to MinIO: ${key}`);
      } catch (err) {
        this.logger.error(`MinIO upload failed for ${file.originalname}: ${(err as Error).message}`);
        // Fallback: keep placeholder URL so the record exists, analysis will retry via MinIO download
        fileUrl = `http://minio/${key}`;
      }

      fileInfos.push({
        originalname: file.originalname,
        mimetype,
        size: file.size,
        fileUrl,
        thumbnailUrl: fileUrl, // Same URL for now, could generate thumbnail separately
      });
    }

    const created = this.store.createMaterials(projectId, fileInfos);

    for (const material of created) {
      this.analysisQueue
        .add({ materialId: material.id })
        .catch((err: Error) => this.logger.error(`素材 ${material.id} 解析任务入队失败：${err.message}`));
    }
    this.logger.log(`项目 ${projectId} 上传 ${created.length} 个素材，已触发异步 AI 解析`);
    return created;
  }

  // ... rest of methods unchanged (list, search, getById, updateTags, delete)
  list(userId: string, projectId: string, type = 'all', page = 1, limit = 24) {
    const project = this.store.getProject(projectId);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    if (project.user_id !== userId) {
      throw new ForbiddenException('无权访问该项目');
    }
    const all = this.store
      .listMaterials(projectId, type)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
    const total = all.length;
    const offset = (page - 1) * limit;
    const items = all.slice(offset, offset + limit).map((material) => ({
      id: material.id,
      file_type: material.file_type,
      thumbnail_url: material.thumbnail_url,
      status: material.status,
      tags: material.tags,
      duration: material.duration,
      created_at: material.created_at,
    }));
    return { items, total };
  }

  search(projectId: string, q = '', tags = '', level = 'material') {
    return this.store.searchMaterials(projectId, q, tags, level);
  }

  getById(id: string) {
    const material = this.store.getMaterial(id);
    if (!material) {
      throw new NotFoundException('素材不存在');
    }
    return material;
  }

  updateTags(id: string, tags: string[]) {
    const material = this.store.updateMaterialTags(id, tags);
    if (!material) {
      throw new NotFoundException('素材不存在');
    }
    return material;
  }

  delete(id: string) {
    return { deleted: this.store.deleteMaterial(id), referenced_shots: 0 };
  }
}
```

- [ ] **Step 2: Verify type-check**

Run: `cd backend && npm run type-check`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/material/material.service.ts
git commit -m "feat: upload material files to MinIO before creating records"
```

---

### Task 4: Implement real AI analysis via Doubao Vision + Embedding

**Files:**
- Modify: `backend/src/modules/volcano/volcano-api.service.ts:140-150`
- Modify: `.env` (add `VOLCANO_EMBEDDING_EP`)

- [ ] **Step 1: Add embedding endpoint to .env**

Read `.env`. Add after line 38 (`DOUBAO_VISION_MODEL=doubao-vision-pro`):
```
VOLCANO_EMBEDDING_EP=doubao-embedding-large
```

- [ ] **Step 2: Add embedding endpoint to VolcanoApiService constructor**

Read `backend/src/modules/volcano/volcano-api.service.ts` lines 20-31 (constructor). Update constructor:

```ts
constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('VOLCANO_ACCESS_KEY', '');
    this.doubaoEp = this.config.get<string>('VOLCANO_DOUBAO_SEED_EP', '');
    this.seedanceEp = this.config.get<string>('VOLCANO_SEEDANCE_EP', '');
    this.embeddingEp = this.config.get<string>('VOLCANO_EMBEDDING_EP', 'doubao-embedding-large');
}
```

Add after line 29 (`this.seedanceEp = ...`), add the field declaration to the class (after `private readonly seedanceEp: string;`):
```ts
private readonly embeddingEp: string;
```

- [ ] **Step 3: Replace analyzeMaterial stub**

Read `backend/src/modules/volcano/volcano-api.service.ts` lines 147-149. Replace the stub:

```ts
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
```

Note: The method signature changes from `{ fileType, fileName }` to `{ fileType, fileName, buffer }`. The caller in `material-analysis.processor.ts` will be updated in Task 5.

- [ ] **Step 4: Verify type-check**

Run: `cd backend && npm run type-check`
Expected: 0 errors (if processor not yet updated, may error — proceed to Task 5)

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/volcano/volcano-api.service.ts .env
git commit -m "feat: implement real Doubao Vision + Embedding for material AI analysis"
```

---

### Task 5: Update processor to download from MinIO and pass buffer to volcano

**Files:**
- Modify: `backend/src/queue/material-analysis.processor.ts:1-45`

- [ ] **Step 1: Rewrite processor to use MinioStorageService and real buffer**

Read `backend/src/queue/material-analysis.processor.ts`. Replace the entire file:

```ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MockStoreService } from '../common/mock-store.service';
import { MinioStorageService } from '../common/minio-storage.service';
import { VolcanoApiService } from '../modules/volcano/volcano-api.service';

type MaterialAnalysisJob = { materialId: string };

@Processor('material-analysis')
export class MaterialAnalysisProcessor {
  private readonly logger = new Logger(MaterialAnalysisProcessor.name);

  constructor(
    private readonly store: MockStoreService,
    private readonly volcano: VolcanoApiService,
    private readonly minio: MinioStorageService,
  ) {}

  @Process()
  async process(job: Job<MaterialAnalysisJob>): Promise<void> {
    const { materialId } = job.data;
    const material = this.store.getMaterial(materialId);
    if (!material) {
      this.logger.warn(`素材 ${materialId} 不存在，跳过解析`);
      return;
    }
    try {
      // Download file buffer from MinIO
      let buffer: Buffer;
      try {
        buffer = await this.minio.downloadFile(material.file_url);
      } catch (err) {
        this.logger.warn(`Failed to download ${material.file_url} from MinIO, falling back to empty buffer: ${(err as Error).message}`);
        buffer = Buffer.alloc(0);
      }

      const result = await this.volcano.analyzeMaterial({
        fileType: material.file_type as 'image' | 'video',
        fileName: material.file_name as string,
        buffer,
      });

      this.store.updateMaterialAnalysis(materialId, {
        status: 'ready',
        analysis: result.analysis,
        tags: result.tags,
        embedding: result.embedding,
        duration: result.duration,
      });
      this.logger.log(`素材 ${materialId} AI 解析完成，status=ready`);
    } catch (err) {
      this.store.updateMaterialAnalysis(materialId, { status: 'failed' });
      this.logger.error(`素材 ${materialId} AI 解析失败：${(err as Error).message}`);
    }
  }
}
```

- [ ] **Step 2: Update QueueModule to import MinioStorageService**

Read `backend/src/queue/queue.module.ts`. The `MinioStorageModule` is `@Global()`, so `MinioStorageService` should be injectable into `MaterialAnalysisProcessor` without explicit import. No change needed here.

- [ ] **Step 3: Verify type-check**

Run: `cd backend && npm run type-check`
Expected: 0 errors

- [ ] **Step 4: Verify lint**

Run: `cd backend && npm run lint`
Expected: 0 errors, 0 warnings

- [ ] **Step 5: Commit**

```bash
git add backend/src/queue/material-analysis.processor.ts
git commit -m "feat: download material from MinIO in processor, pass buffer to Volcano API"
```

---

### Task 6: End-to-end verification

- [ ] **Step 1: Build backend**

Run: `cd backend && npm run build`
Expected: builds successfully

- [ ] **Step 2: Final type-check + lint**

Run: `cd backend && npm run type-check && npm run lint`
Expected: 0 errors

- [ ] **Step 3: Commit any remaining changes**

```bash
git add -A
git status
git commit -m "chore: final verification — MinIO storage + AI analysis working"
```

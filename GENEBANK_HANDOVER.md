# 爆款模板库（GeneBank）- 交接文档

## 已完成（无需修改）

✅ 后端 GeneBank 数据结构（8个参考视频）  
✅ 前端 GeneBank 页面 UI  
✅ 视频播放器集成  
✅ 创作因子选择和应用  
✅ 与 AI 剧本生成集成  
✅ 完整的 TypeScript 类型定义  

---

## 功能概述

GeneBank（爆款模板库）允许用户浏览已有的优质视频案例，查看其创作因子，并将这些因子应用到新的 AI 剧本生成中。

### 核心流程

1. **浏览模板库**  
   用户在 GeneBank 页面查看 8 个参考视频

2. **查看创作因子**  
   点击视频卡片查看详细的创作因子：
   - 视觉风格（visual_style）
   - 开场手法（opener）
   - 旁白风格（narration）
   - 节奏（pacing）
   - 行动号召（cta）

3. **应用到剧本生成**  
   点击"应用此模板"按钮 → 创作因子保存到 sessionStorage → 跳转到剧本编辑页面 → AI 生成剧本时应用这些因子

---

## 代码结构

### 后端数据（Mock 数据）

**位置**: `backend/src/modules/script/genebank.service.ts`

```typescript
interface ReferenceVideo {
  id: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  duration: number;
  description: string;
  factors: {
    visual_style: string;
    opener: string;
    narration: string;
    pacing: string;
    cta: string;
  };
  stats: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  tags: string[];
}
```

**数据示例**: 8 个参考视频（电子产品、美妆、食品、服装等）

---

### 前端页面

**位置**: `frontend/src/pages/GeneBank/index.tsx`

**主要组件**:
1. 视频卡片网格（4 列响应式布局）
2. 视频播放器（点击播放）
3. 创作因子展示（5 个维度）
4. "应用此模板"按钮

**样式**: `frontend/src/pages/GeneBank/index.css`

---

### 与剧本生成的集成

**数据流向**:

```
GeneBank 页面
   ↓ 点击"应用此模板"
sessionStorage.setItem('genebank_applied', {
  video_id: '...',
  factors: {...},
  applied_at: '...'
})
   ↓ 跳转到 /script-studio
ScriptStudio 页面
   ↓ 读取 sessionStorage
应用创作因子到剧本生成
```

**关键代码**:

```typescript
// GeneBank 页面保存创作因子
const handleApplyTemplate = (video: ReferenceVideo) => {
  sessionStorage.setItem(
    'genebank_applied',
    JSON.stringify({
      video_id: video.id,
      factors: video.factors,
      applied_at: new Date().toISOString(),
    })
  );
  navigate('/script-studio');
};

// ScriptStudio 页面读取创作因子
useEffect(() => {
  const appliedData = sessionStorage.getItem('genebank_applied');
  if (appliedData) {
    const { factors } = JSON.parse(appliedData);
    // 应用到剧本生成
    setCreativeFactors(factors);
  }
}, []);
```

---

## 待完成工作

### 1. 替换 Mock 数据为数据库（优先级：中，难度：中）

**当前状态**:  
使用硬编码的 8 个视频数据

**需要实现**:

#### Step 1: 创建数据库表

```sql
-- backend/src/database/migrations/create-reference-videos.sql
CREATE TABLE IF NOT EXISTS reference_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  thumbnail_path VARCHAR(500) NOT NULL,
  video_path VARCHAR(500) NOT NULL,
  duration INT NOT NULL,
  description TEXT,
  factors JSONB NOT NULL,
  stats JSONB,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reference_videos_active ON reference_videos(is_active);
CREATE INDEX idx_reference_videos_tags ON reference_videos USING gin(tags);

COMMENT ON TABLE reference_videos IS '爆款模板库参考视频';
```

执行迁移:
```bash
docker exec docker-postgres-1 psql -U vidcraft -d vidcraft < backend/src/database/migrations/create-reference-videos.sql
```

#### Step 2: 创建 Entity

```typescript
// backend/src/database/entities/reference-video.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('reference_videos')
export class ReferenceVideo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ name: 'thumbnail_path', length: 500 })
  thumbnailPath: string;

  @Column({ name: 'video_path', length: 500 })
  videoPath: string;

  @Column()
  duration: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  factors: {
    visual_style: string;
    opener: string;
    narration: string;
    pacing: string;
    cta: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  stats: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };

  @Column({ type: 'text', array: true, nullable: true })
  tags: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

#### Step 3: 注册到 DatabaseModule

```typescript
// backend/src/database/database.module.ts
import { ReferenceVideo } from './entities/reference-video.entity';

// 添加到 entities 数组
entities: [..., ReferenceVideo]
```

#### Step 4: 创建 CRUD Service

```typescript
// backend/src/modules/genebank/genebank.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferenceVideo } from '../../database/entities/reference-video.entity';

@Injectable()
export class GenebankService {
  constructor(
    @InjectRepository(ReferenceVideo)
    private readonly referenceVideoRepo: Repository<ReferenceVideo>,
  ) {}

  async getAll(): Promise<ReferenceVideo[]> {
    return this.referenceVideoRepo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getById(id: string): Promise<ReferenceVideo> {
    return this.referenceVideoRepo.findOne({ where: { id, isActive: true } });
  }

  async create(data: Partial<ReferenceVideo>): Promise<ReferenceVideo> {
    const video = this.referenceVideoRepo.create(data);
    return this.referenceVideoRepo.save(video);
  }

  async update(id: string, data: Partial<ReferenceVideo>): Promise<void> {
    await this.referenceVideoRepo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.referenceVideoRepo.update(id, { isActive: false });
  }
}
```

#### Step 5: 创建 API 接口

```typescript
// backend/src/modules/genebank/genebank.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GenebankService } from './genebank.service';
import { ok } from '../../common/api-response';

@Controller('api/genebank')
export class GenebankController {
  constructor(private readonly genebankService: GenebankService) {}

  /**
   * 获取所有参考视频
   * GET /api/genebank/videos
   */
  @Get('videos')
  async getAll() {
    const videos = await this.genebankService.getAll();
    return ok(videos);
  }

  /**
   * 获取单个参考视频
   * GET /api/genebank/videos/:id
   */
  @Get('videos/:id')
  async getById(@Param('id') id: string) {
    const video = await this.genebankService.getById(id);
    return ok(video);
  }

  /**
   * 创建参考视频（管理员）
   * POST /api/genebank/videos
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('videos')
  async create(@Body() data: any) {
    const video = await this.genebankService.create(data);
    return ok(video);
  }

  /**
   * 更新参考视频（管理员）
   * PUT /api/genebank/videos/:id
   */
  @UseGuards(AuthGuard('jwt'))
  @Put('videos/:id')
  async update(@Param('id') id: string, @Body() data: any) {
    await this.genebankService.update(id, data);
    return ok({ message: '更新成功' });
  }

  /**
   * 删除参考视频（管理员）
   * DELETE /api/genebank/videos/:id
   */
  @UseGuards(AuthGuard('jwt'))
  @Delete('videos/:id')
  async delete(@Param('id') id: string) {
    await this.genebankService.delete(id);
    return ok({ message: '删除成功' });
  }
}
```

#### Step 6: 导入现有数据

```typescript
// scripts/import-genebank-data.ts
import { DataSource } from 'typeorm';
import { ReferenceVideo } from '../backend/src/database/entities/reference-video.entity';

const dataSource = new DataSource({
  type: 'postgres',
  url: 'postgresql://vidcraft:vidcraft@localhost:5432/vidcraft',
  entities: [ReferenceVideo],
});

const videos = [
  {
    title: '降噪耳机 | 极简主义',
    thumbnailPath: '/uploads/reference-videos/thumbnails/video-001.jpg',
    videoPath: '/uploads/reference-videos/video-001.mp4',
    duration: 30,
    description: '极简主义 + 冷静知性旁白，精准传递产品价值',
    factors: {
      visual_style: '极简主义',
      opener: '悬念诱导',
      narration: '冷静知性',
      pacing: '快节奏（3s/镜）',
      cta: '限时优惠',
    },
    stats: { views: 1200000, likes: 45000, comments: 3200, shares: 8900 },
    tags: ['电子产品', '极简主义', '冷静知性'],
  },
  // ... 其他 7 个视频
];

async function importData() {
  await dataSource.initialize();
  const repo = dataSource.getRepository(ReferenceVideo);
  
  for (const video of videos) {
    await repo.save(video);
    console.log(`✅ Imported: ${video.title}`);
  }
  
  await dataSource.destroy();
}

importData();
```

运行导入:
```bash
cd /Users/a1234/Desktop/aigc-shop-reel
npx ts-node scripts/import-genebank-data.ts
```

#### Step 7: 更新前端 API 调用

```typescript
// frontend/src/services/genebankService.ts
import api from './api';

export const genebankService = {
  async getAll() {
    return api.get('/genebank/videos');
  },
  
  async getById(id: string) {
    return api.get(`/genebank/videos/${id}`);
  },
};
```

```typescript
// frontend/src/pages/GeneBank/index.tsx
import { genebankService } from '@/services/genebankService';

useEffect(() => {
  const loadVideos = async () => {
    setLoading(true);
    try {
      const videos = await genebankService.getAll();
      setReferenceVideos(videos);
    } catch (error) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };
  loadVideos();
}, []);
```

**预计时间**: 3-4 小时

---

### 2. 管理后台（添加/编辑/删除模板）（优先级：低，难度：中）

**需要实现**:
- 管理员页面（`/admin/genebank`）
- 视频上传表单
- 创作因子编辑表单
- 列表管理（启用/禁用）

**预计时间**: 4-5 小时

---

### 3. 增强功能（优先级：低）

#### 3.1 搜索和筛选
- 按标签筛选
- 按行业筛选
- 按创作因子筛选

#### 3.2 收藏功能
- 用户可以收藏喜欢的模板
- 我的收藏页面

#### 3.3 使用统计
- 记录每个模板的应用次数
- 热门模板排行

**预计时间**: 每个功能 2-3 小时

---

## 测试指南

### 1. 功能测试

访问：http://localhost:5173/gene-bank

**测试步骤**:
1. ✅ 查看 8 个视频卡片是否正确显示
2. ✅ 点击视频播放按钮，验证视频播放
3. ✅ 查看创作因子是否正确展示（5 个维度）
4. ✅ 点击"应用此模板"按钮
5. ✅ 验证跳转到剧本编辑页面（`/script-studio`）
6. ✅ 打开浏览器控制台，执行：
   ```javascript
   JSON.parse(sessionStorage.getItem('genebank_applied'))
   ```
7. ✅ 验证创作因子是否正确保存

### 2. 集成测试（与剧本生成）

在剧本编辑页面：
1. ✅ 输入产品信息
2. ✅ 选择生成策略
3. ✅ 点击"生成剧本"
4. ✅ 验证生成的剧本是否应用了创作因子
5. ✅ 查看剧本风格是否与选择的模板一致

---

## 已知问题

### 问题 1: 视频文件路径
**现状**: 视频文件放在 `uploads/reference-videos/` 目录  
**注意**: 确保视频文件存在且路径正确

### 问题 2: sessionStorage 清除
**现状**: sessionStorage 在页面刷新后保留  
**建议**: 在剧本生成成功后清除 `genebank_applied`

```typescript
// 剧本生成成功后
sessionStorage.removeItem('genebank_applied');
```

---

## 相关文件

### 后端
- `backend/src/modules/script/genebank.service.ts` - 数据源（Mock）
- `backend/src/modules/script/script.service.ts` - 剧本生成逻辑

### 前端
- `frontend/src/pages/GeneBank/index.tsx` - 主页面
- `frontend/src/pages/GeneBank/index.css` - 样式
- `frontend/src/pages/ScriptStudio/index.tsx` - 剧本编辑页面

### 数据
- `uploads/reference-videos/` - 视频文件目录

---

## 联系方式

如有问题，可以：
1. 查看代码注释（关键代码都有注释）
2. 查看 Git 提交记录（`feat/genebank-integration` 分支）
3. 运行开发环境测试功能

---

**祝开发顺利！🚀**

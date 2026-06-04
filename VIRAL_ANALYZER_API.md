# 优质视频分析器 - API 文档

## 概述

用户上传视频文件，AI 自动拆解分析视频的创作手法，提取 Hook、Selling Points、Pacing、Style 等创作因子，可基于拆解结果生成同款 AI 剧本。

---

## API 接口

### 1. 上传视频并创建拆解任务

**POST** `/api/viral-analyzer/upload`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**
```
video: <File> (视频文件，最大 500MB)
```

**Response:**
```json
{
  "code": 200,
  "msg": null,
  "data": {
    "id": "uuid",
    "title": "视频标题",
    "status": "pending",
    "created_at": "2026-06-05T10:00:00Z"
  }
}
```

**说明：**
- 上传成功后立即返回，后台异步分析
- 支持格式：MP4, MOV, AVI 等
- 分析过程约 5-30 秒

---

### 2. 获取拆解历史列表

**GET** `/api/viral-analyzer/list?page=1&limit=20`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "视频标题",
        "thumbnail_url": "/api/viral-analyzer/videos/{id}/thumbnail",
        "status": "completed",
        "duration": 30,
        "created_at": "2026-06-05T10:00:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "limit": 20
  }
}
```

**状态说明：**
- `pending`: 等待分析
- `analyzing`: 分析中
- `completed`: 分析完成
- `failed`: 分析失败

---

### 3. 获取拆解详情

**GET** `/api/viral-analyzer/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "code": 200,
  "data": {
    "id": "uuid",
    "title": "视频标题",
    "video_url": "/api/viral-analyzer/videos/{id}/stream",
    "thumbnail_url": "/api/viral-analyzer/videos/{id}/thumbnail",
    "duration": 30,
    "status": "completed",
    "error_message": null,
    "analysis": {
      "hook": {
        "time_range": "00:00 — 00:03",
        "content": "大特写产品在光下旋转，伴 0.5s 重低音 sting，瞬间锁定注意力。"
      },
      "selling_points": [
        "40dB 主动降噪 · 直接 demo 对比",
        "14 小时续航 · 数字翻牌动效",
        "3 麦克风通话降噪 · 真人示范"
      ],
      "pacing": "9 个分镜 / 30 秒，平均 3.3s 一镜，高密度叙事，符合 Z 世代节奏。",
      "style": "冷色调 + 局部金色暖光，质感工业风，与产品科技感高度协调。"
    },
    "creative_factors": {
      "visual_style": "极简主义",
      "opener": "悬念诱导",
      "narration": "冷静知性",
      "pacing": "快节奏（3s/镜）",
      "cta": "限时优惠"
    },
    "created_at": "2026-06-05T10:00:00Z"
  }
}
```

---

### 4. 删除拆解记录

**DELETE** `/api/viral-analyzer/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "code": 200,
  "data": {
    "message": "删除成功"
  }
}
```

**说明：**
- 同时删除视频文件和数据库记录

---

### 5. 视频流式播放

**GET** `/api/viral-analyzer/videos/:id/stream`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
- Content-Type: `video/mp4`
- Body: 视频流

**说明：**
- 支持 Range 请求（断点续传）

---

### 6. 获取视频缩略图

**GET** `/api/viral-analyzer/videos/:id/thumbnail`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
- Content-Type: `image/jpeg`
- Body: 图片数据

---

## 数据模型

### AnalyzedVideo

```typescript
interface AnalyzedVideo {
  id: string;
  user_id: string;
  title: string;
  original_filename: string;
  video_path: string;
  thumbnail_path: string | null;
  duration: number | null;
  file_size: number | null;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  error_message: string | null;
  
  analysis: {
    hook: {
      time_range: string;
      content: string;
    };
    selling_points: string[];
    pacing: string;
    style: string;
  } | null;
  
  creative_factors: {
    visual_style: string;
    opener: string;
    narration: string;
    pacing: string;
    cta: string;
  } | null;
  
  created_at: string;
  updated_at: string;
}
```

---

## 集成剧本生成

### 使用拆解结果生成剧本

拆解完成后，可以将 `creative_factors` 应用到剧本生成：

**方法 1：前端传递**
```typescript
// 在 ScriptStudio 页面，读取 analyzed video 的 creative_factors
const analyzedVideo = await viralAnalyzerService.getDetail(id);

// 保存到 sessionStorage
sessionStorage.setItem('genebank_applied', JSON.stringify({
  viral_id: analyzedVideo.id,
  factors: analyzedVideo.creative_factors,
  applied_at: new Date().toISOString()
}));

// 跳转到剧本编辑
navigate('/script-studio');
```

**方法 2：后端集成**
修改 `script.service.ts`：
```typescript
async generate(
  projectId: string,
  strategyType: string,
  referenceVideoId?: string,
  analyzedVideoId?: string  // 新增参数
) {
  let creativeFactors: CreativeFactors;
  
  if (analyzedVideoId) {
    // 从 analyzed_videos 获取
    const analyzed = await this.analyzedVideoRepo.findOne({ where: { id: analyzedVideoId } });
    creativeFactors = analyzed.creativeFactors;
  } else if (referenceVideoId) {
    // 从 genebank 获取
    const refVideo = this.geneBank.getReferenceVideoById(referenceVideoId);
    creativeFactors = refVideo.factors;
  }
  
  return this.director.generateStoryboard(productInfo, strategyType, creativeFactors);
}
```

---

## 后续开发

### TODO: 实现真实 AI 分析

当前使用 Mock 数据，需要实现：

1. **视频关键帧提取**
   ```bash
   npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg
   ```

2. **LLM 视频分析**
   - 使用支持视觉的 LLM（如 GPT-4V, Claude 3）
   - 提取 Hook、Selling Points、Pacing、Style
   - 映射到 5 个创作因子维度

3. **缩略图生成**
   ```typescript
   // 提取视频第一帧作为缩略图
   ffmpeg(videoPath)
     .screenshots({
       timestamps: ['00:00:01'],
       filename: 'thumbnail.jpg',
       folder: 'uploads/analyzed-videos/thumbnails'
     });
   ```

---

## 测试指南

### 使用 Postman/cURL 测试

1. **登录获取 token**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "test", "password": "test123"}'
   ```

2. **上传视频**
   ```bash
   curl -X POST http://localhost:3000/api/viral-analyzer/upload \
     -H "Authorization: Bearer <token>" \
     -F "video=@/path/to/video.mp4"
   ```

3. **获取列表**
   ```bash
   curl -X GET "http://localhost:3000/api/viral-analyzer/list?page=1&limit=20" \
     -H "Authorization: Bearer <token>"
   ```

4. **获取详情**
   ```bash
   curl -X GET http://localhost:3000/api/viral-analyzer/{id} \
     -H "Authorization: Bearer <token>"
   ```

---

## 前端集成示例

```typescript
// frontend/src/services/viralAnalyzerService.ts
export const viralAnalyzerService = {
  // 上传视频
  async upload(file: File) {
    const formData = new FormData();
    formData.append('video', file);
    return api.post('/viral-analyzer/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // 获取列表
  async getList(params: { page: number; limit: number }) {
    return api.get('/viral-analyzer/list', { params });
  },
  
  // 获取详情
  async getDetail(id: string) {
    return api.get(`/viral-analyzer/${id}`);
  },
  
  // 删除
  async delete(id: string) {
    return api.delete(`/viral-analyzer/${id}`);
  },
};
```

---

## 完成状态

✅ **已完成**：
- ✅ 数据库 Entity
- ✅ Service 层（CRUD + 文件上传）
- ✅ Controller 层（所有接口）
- ✅ 视频流式播放
- ✅ 缩略图接口
- ✅ 异步分析任务（Mock 数据）

⏳ **待开发**：
- ⏳ 真实 AI 视频分析
- ⏳ 缩略图生成
- ⏳ 前端页面开发
- ⏳ 与剧本生成集成测试

---

**后端基础架构搭建完成！🎉**

下一步：
1. 重启后端服务测试 API
2. 开发前端页面
3. 实现真实 AI 分析

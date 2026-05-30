import { http, HttpResponse } from 'msw';
import type {
  GenerateVideoPayload,
  VideoShot,
  VideoTask,
} from '@/types';
import { findMockProject } from './projects';

/** 可真实播放的示例视频（demo 用），让"已完成项目直接播放"看得到效果 */
const SAMPLE_MP4 = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

/**
 * 视频生成 Mock
 * 端点按《VidCraft API 接口规范文档 v1.0》第 6 章
 *
 * 状态机：generate 创建任务 → 每次 getStatus 按"距 startTime 的时间"推进进度。
 * 模拟总渲染时长 12 秒（前端轮询 800ms 一次，看到平滑进度）。
 */

const DEMO_DURATION_MS = 12_000;   // 整体渲染耗时
const QUEUE_DELAY_MS   = 600;      // 起步排队时间（让首帧能看到 queued → rendering 的切换）

const demoShots: Omit<VideoShot, 'status' | 'progress'>[] = [
  { id: 'vshot-01', index: 0, label: '产品外观展示', thumb_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop' },
  { id: 'vshot-02', index: 1, label: 'APP 控制演示', thumb_url: 'https://images.unsplash.com/photo-1574170504715-c7e6c5d2b6e4?w=200&h=200&fit=crop' },
  { id: 'vshot-03', index: 2, label: '观影模式切换', thumb_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop' },
  { id: 'vshot-04', index: 3, label: '全景互联生态', thumb_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop' },
  { id: 'vshot-05', index: 4, label: '号召购买 CTA', thumb_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop' },
];

interface TaskRecord {
  task: VideoTask;
  startTime: number;
}

const tasksStore = new Map<string, TaskRecord>();

function buildInitialTask(id: string, payload?: GenerateVideoPayload): VideoTask {
  return {
    id,
    project_id: payload?.project_id || 'demo-project',
    script_id:  payload?.script_id  || 'demo-script-001',
    render_id:  `VC-${Math.floor(10000 + Math.random() * 90000)}-AIGC`,
    status: 'queued',
    progress: 0,
    estimated_remaining: Math.ceil(DEMO_DURATION_MS / 1000),
    resolution: '1080×1920 (9:16)',
    quality: '4K UPSCALED',
    ratio: (payload?.ratio || '9:16'),
    title: '智能家居产品推介',
    shots: demoShots.map((s) => ({ ...s, status: 'queued', progress: 0 })),
    created_at: new Date().toISOString(),
  };
}

/**
 * 按当前时间推进任务进度
 * 分镜逐个进入"rendering"，到 progress=100% 后切到 "completed"
 */
function advanceTask(rec: TaskRecord): VideoTask {
  const elapsed = Date.now() - rec.startTime;
  const task = rec.task;

  if (task.status === 'completed' || task.status === 'failed') return task;

  // 整体进度
  const rawProgress = (elapsed - QUEUE_DELAY_MS) / (DEMO_DURATION_MS - QUEUE_DELAY_MS) * 100;
  const overallProgress = Math.max(0, Math.min(100, rawProgress));

  // 分镜进度：把 DEMO_DURATION 平均分给 N 个分镜
  const renderMs = DEMO_DURATION_MS - QUEUE_DELAY_MS;
  const slicePerShot = renderMs / task.shots.length;
  const renderElapsed = elapsed - QUEUE_DELAY_MS;

  task.shots = task.shots.map((shot, i) => {
    const shotStart = i * slicePerShot;
    const shotEnd   = shotStart + slicePerShot;
    if (renderElapsed < shotStart) return { ...shot, status: 'queued', progress: 0 };
    if (renderElapsed >= shotEnd)  return { ...shot, status: 'completed', progress: 100 };
    const shotProgress = (renderElapsed - shotStart) / slicePerShot * 100;
    return { ...shot, status: 'rendering', progress: Math.round(shotProgress) };
  });

  // 整体状态判定
  if (elapsed < QUEUE_DELAY_MS) {
    task.status = 'queued';
  } else if (overallProgress >= 100) {
    task.status = 'completed';
    task.completed_at = new Date().toISOString();
    task.cover_url = 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1200&h=750&fit=crop';
    task.download_url = `https://demo.vidcraft.io/videos/${task.id}.mp4`;
    task.shots = task.shots.map((s) => ({ ...s, status: 'completed', progress: 100 }));
  } else {
    task.status = 'rendering';
  }

  task.progress = Math.round(overallProgress);
  task.estimated_remaining = Math.max(0, Math.ceil((DEMO_DURATION_MS - elapsed) / 1000));

  return task;
}

export const videoHandlers = [
  // GET /api/videos?project_id=  —— 取项目「已有的最新视频」（前端进视频页判断是否可直接播放）
  // ⚠️ Backend coordination：spec 未定义此端点，前端约定形态见 videoService.getLatestByProject。
  http.get('/api/videos', ({ request }) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('project_id') || '';
    const project = findMockProject(projectId);

    // 仅「已完成」项目才有可播放的成片；其余（草稿/生成中）返回 null → 页面回到空闲态
    if (!project || project.status !== 'completed') {
      return HttpResponse.json({
        code: 200, msg: null, total: 0, data: null, traceId: `mock-${Date.now()}`,
      });
    }

    const task: VideoTask = {
      id: `video-of-${projectId}`,
      project_id: projectId,
      script_id: 'demo-script-001',
      render_id: `VC-${Math.floor(10000 + Math.random() * 90000)}-AIGC`,
      status: 'completed',
      progress: 100,
      estimated_remaining: 0,
      resolution: '1080×1920 (9:16)',
      quality: '4K UPSCALED',
      ratio: '9:16',
      title: project.name,
      cover_url: project.cover_url,
      download_url: SAMPLE_MP4,
      shots: demoShots.map((s) => ({ ...s, status: 'completed', progress: 100 })),
      created_at: project.updated_at,
      completed_at: project.updated_at,
    };
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: task, traceId: `mock-${Date.now()}`,
    });
  }),

  // POST /api/videos/generate
  http.post('/api/videos/generate', async ({ request }) => {
    const payload = (await request.json().catch(() => ({}))) as GenerateVideoPayload;
    const id = `video-${Date.now()}`;
    const task = buildInitialTask(id, payload);
    tasksStore.set(id, { task, startTime: Date.now() });
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: task, traceId: `mock-${Date.now()}`,
    });
  }),

  // GET /api/videos/:id/status
  http.get('/api/videos/:id/status', ({ params }) => {
    const id = String(params.id);
    let rec = tasksStore.get(id);
    if (!rec) {
      // 容错：访客直接打开 /video-creation 时也给一个 demo 任务
      const task = buildInitialTask(id);
      rec = { task, startTime: Date.now() };
      tasksStore.set(id, rec);
    }
    const task = advanceTask(rec);
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: task, traceId: `mock-${Date.now()}`,
    });
  }),

  // POST /api/videos/:id/shots/:index/regenerate
  http.post('/api/videos/:id/shots/:index/regenerate', ({ params }) => {
    const id = String(params.id);
    const index = Number(params.index);
    const rec = tasksStore.get(id);
    if (!rec) {
      return HttpResponse.json(
        { code: 404, msg: '任务不存在', total: 0, data: null, traceId: `mock-${Date.now()}` },
        { status: 404 },
      );
    }
    const shot = rec.task.shots.find((s) => s.index === index);
    if (!shot) {
      return HttpResponse.json(
        { code: 404, msg: '分镜不存在', total: 0, data: null, traceId: `mock-${Date.now()}` },
        { status: 404 },
      );
    }
    shot.status = 'queued';
    shot.progress = 0;
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: shot, traceId: `mock-${Date.now()}`,
    });
  }),

  // PUT /api/videos/:id/settings
  http.put('/api/videos/:id/settings', async ({ params, request }) => {
    const id = String(params.id);
    const rec = tasksStore.get(id);
    if (!rec) {
      return HttpResponse.json(
        { code: 404, msg: '任务不存在', total: 0, data: null, traceId: `mock-${Date.now()}` },
        { status: 404 },
      );
    }
    // mock 不真存 settings，只是回写 task
    await request.json().catch(() => ({}));
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: rec.task, traceId: `mock-${Date.now()}`,
    });
  }),

  // GET /api/videos/:id/download
  http.get('/api/videos/:id/download', ({ params }) => {
    return HttpResponse.json({
      code: 200, msg: null, total: 0,
      data: {
        url: `https://demo.vidcraft.io/videos/${params.id}.mp4`,
        expires_at: new Date(Date.now() + 3600_000).toISOString(),
      },
      traceId: `mock-${Date.now()}`,
    });
  }),

  // POST /api/videos/:id/export
  http.post('/api/videos/:id/export', async ({ params, request }) => {
    const rec = tasksStore.get(String(params.id));
    if (!rec) {
      return HttpResponse.json(
        { code: 404, msg: '任务不存在', total: 0, data: null, traceId: `mock-${Date.now()}` },
        { status: 404 },
      );
    }
    await request.json().catch(() => ({}));
    // mock 直接返回 task，假装完成了导出
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: rec.task, traceId: `mock-${Date.now()}`,
    });
  }),
];

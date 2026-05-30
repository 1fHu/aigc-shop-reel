import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    // 镜像 main.ts 的全局装配，使错误响应信封与生产一致（否则抛出的异常不会被 HttpExceptionFilter 包装）。
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/health (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(response.body.code).toBe(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('guest login and project flow', async () => {
    const guestLogin = await request(app.getHttpServer()).post('/api/auth/guest-login').expect(201);
    const accessToken = guestLogin.body.data.accessToken as string;

    expect(guestLogin.body.code).toBe(200);
    expect(guestLogin.body.data.user.is_guest).toBe(true);

    const projectCreate = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '测试项目', description: 'e2e demo' })
      .expect(201);

    const projectId = projectCreate.body.data.id as string;
    expect(projectCreate.body.code).toBe(200);
    expect(projectCreate.body.data.name).toBe('测试项目');

    const projectList = await request(app.getHttpServer())
      .get('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(projectList.body.code).toBe(200);
    expect(Array.isArray(projectList.body.data)).toBe(true);
    expect(projectList.body.data.some((item: { id: string }) => item.id === projectId)).toBe(true);

    const productConfirm = await request(app.getHttpServer())
      .post(`/api/products/${projectId}/confirm`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    expect(productConfirm.body.code).toBe(200);
    expect(productConfirm.body.data.status).toBe('material_pending');
  });

  it('latest video by project flow', async () => {
    const guestLogin = await request(app.getHttpServer()).post('/api/auth/guest-login');
    const accessToken = guestLogin.body.data.accessToken as string;

    const projectCreate = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '视频回看项目', description: 'e2e' });
    const projectId = projectCreate.body.data.id as string;

    // 新项目暂无视频 → data 为 null（前端据此进入"开始生成"空闲态）
    const before = await request(app.getHttpServer())
      .get('/api/videos')
      .query({ project_id: projectId })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(before.body.code).toBe(200);
    expect(before.body.data).toBeNull();

    // 提交一次生成后 → data 返回该项目最新视频任务
    await request(app.getHttpServer())
      .post('/api/videos/generate')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ project_id: projectId, script_id: 'demo-script' });

    const after = await request(app.getHttpServer())
      .get('/api/videos')
      .query({ project_id: projectId })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(after.body.code).toBe(200);
    expect(after.body.data).not.toBeNull();
    expect(typeof after.body.data.video_id).toBe('string');

    // 不存在的项目 → 404
    const missing = await request(app.getHttpServer())
      .get('/api/videos')
      .query({ project_id: '00000000-0000-0000-0000-0000000000ff' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(missing.body.code).toBe(404);
  });

  it('material upload and list flow', async () => {
    const guestLogin = await request(app.getHttpServer()).post('/api/auth/guest-login');
    const accessToken = guestLogin.body.data.accessToken as string;

    const projectCreate = await request(app.getHttpServer())
      .post('/api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '素材测试项目', description: 'material e2e' })
      .expect(201);
    const projectId = projectCreate.body.data.id as string;

    const upload = await request(app.getHttpServer())
      .post('/api/materials/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('project_id', projectId)
      .attach('files', Buffer.from('fake-image-bytes'), { filename: 'shot.jpg', contentType: 'image/jpeg' })
      .attach('files', Buffer.from('fake-video-bytes'), { filename: 'clip.mp4', contentType: 'video/mp4' })
      .expect(201);
    expect(upload.body.code).toBe(200);
    expect(upload.body.total).toBe(2);
    expect(upload.body.data).toHaveLength(2);
    expect(upload.body.data[0].status).toBe('parsing');
    const uploadedId = upload.body.data[0].id as string;

    const reject = await request(app.getHttpServer())
      .post('/api/materials/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('project_id', projectId)
      .attach('files', Buffer.from('not-a-media-file'), { filename: 'note.txt', contentType: 'text/plain' })
      .expect(400);
    expect(reject.body.code).toBe(400);

    const list = await request(app.getHttpServer())
      .get('/api/materials')
      .query({ project_id: projectId })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(list.body.code).toBe(200);
    expect(list.body.total).toBe(2);
    expect(list.body.data.some((item: { id: string }) => item.id === uploadedId)).toBe(true);

    const videoOnly = await request(app.getHttpServer())
      .get('/api/materials')
      .query({ project_id: projectId, type: 'video' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(videoOnly.body.total).toBe(1);
    expect(videoOnly.body.data[0].file_type).toBe('video');

    // 异步 AI 解析编排骨架：material-analysis 队列的 processor 应把 status 从 parsing 翻成 ready，并回填 tags。
    const deadline = Date.now() + 8000;
    let analyzed: { id: string; status: string; tags: string[] } | undefined;
    while (Date.now() < deadline) {
      const poll = await request(app.getHttpServer())
        .get('/api/materials')
        .query({ project_id: projectId })
        .set('Authorization', `Bearer ${accessToken}`);
      analyzed = poll.body.data.find((m: { id: string }) => m.id === uploadedId);
      if (analyzed && analyzed.status === 'ready') break;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    expect(analyzed?.status).toBe('ready');
    expect(analyzed?.tags.length).toBeGreaterThan(0);
  }, 20000);

  it('register, login and profile flow', async () => {
    const email = `e2e+${Date.now()}@example.test`;
    const password = 'Password123!';

    const register = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password, confirmPassword: password })
      .expect(201);
    expect(register.body.code).toBe(200);
    const accessToken = register.body.data.accessToken as string;
    expect(accessToken).toBeTruthy();

    const profile = await request(app.getHttpServer())
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(profile.body.code).toBe(200);
    expect(profile.body.data.email).toBe(email);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(201);
    expect(login.body.code).toBe(200);

    const loginToken = login.body.data.accessToken as string;
    const newNick = 'e2e-user';
    const update = await request(app.getHttpServer())
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${loginToken}`)
      .send({ nickname: newNick })
      .expect(200);
    expect(update.body.code).toBe(200);
    expect(update.body.data.nickname).toBe(newNick);
  });

  it('documented lookup endpoints return mock data', async () => {
    const guestLogin = await request(app.getHttpServer()).post('/api/auth/guest-login');
    const accessToken = guestLogin.body.data.accessToken as string;

    const factors = await request(app.getHttpServer())
      .get('/api/factors')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(factors.body.data.length).toBeGreaterThan(0);

    const genes = await request(app.getHttpServer())
      .get('/api/genes/search')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(genes.body.data.length).toBeGreaterThan(0);

    const library = await request(app.getHttpServer())
      .get('/api/viral-library/search')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(library.body.data.length).toBeGreaterThan(0);
  });
});

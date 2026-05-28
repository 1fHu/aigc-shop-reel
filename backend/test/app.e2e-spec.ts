import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
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
  });

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

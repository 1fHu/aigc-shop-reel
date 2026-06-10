# PostgreSQL Migration — Auth + Project + Product + Material

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Auth, Project, Product, Material modules from in-memory MockStoreService to TypeORM + PostgreSQL. Other modules keep mock store.

**Architecture:** Enable TypeORM connection in DatabaseModule, fix entity/SQL column drift, create a shared TypeOrmModule.forFeature registration for all 4 entities, then replace `store.*` calls with `repository.*` calls in each service. Services use both TypeORM and MockStore where needed (e.g., auth still needs mock store for verification codes and refresh tokens temporarily).

**Tech Stack:** NestJS 10, TypeORM 0.3, pg 8.12, PostgreSQL 16 + pgvector (Docker)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/src/database/database.module.ts` | **Rewrite** | TypeORM connection + forFeature registration |
| `backend/src/database/entities/material.entity.ts` | Modify | Add thumbnail_url, status, duration, slices columns |
| `backend/src/database/entities/project.entity.ts` | Modify | Add is_guest column (missing) |
| `scripts/init-db.sql` | Modify | Add missing columns to materials table |
| `backend/src/modules/auth/auth.service.ts` | Modify | Use TypeORM User repo for user CRUD, keep mock store for verification codes |
| `backend/src/modules/project/project.service.ts` | Modify | Use TypeORM Project repo |
| `backend/src/modules/product/product.service.ts` | Modify | Use TypeORM Project repo for product_info |
| `backend/src/modules/material/material.service.ts` | Modify | Use TypeORM Material repo |

---

### Task 1: Fix entity/SQL column drift

**Files:**
- Modify: `backend/src/database/entities/material.entity.ts`
- Modify: `backend/src/database/entities/project.entity.ts`
- Modify: `scripts/init-db.sql`

- [ ] **Step 1: Add missing columns to Material entity**

Read `backend/src/database/entities/material.entity.ts`. Add after the `tags` column (line 35):

```typescript
  @Column({ type: 'varchar', nullable: true, name: 'thumbnail_url' })
  thumbnailUrl: string;

  @Column({ type: 'varchar', default: 'parsing', name: 'status' })
  status: string;

  @Column({ type: 'float', nullable: true })
  duration: number;

  @Column({ type: 'jsonb', nullable: true })
  slices: object;
```

- [ ] **Step 2: Add is_guest to Project entity**

Read `backend/src/database/entities/project.entity.ts`. Add after line 50 (`tiktokReady`):

```typescript
  @Column({ type: 'boolean', default: false, name: 'is_guest' })
  isGuest: boolean;
```

- [ ] **Step 3: Add missing columns to init-db.sql**

Read `scripts/init-db.sql`. In the materials table (lines 38-49), add after `tags TEXT[]`:

```sql
    thumbnail_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'parsing',
    duration FLOAT,
    slices JSONB DEFAULT '[]',
```

In the projects table (lines 25-35), add after `tiktok_ready` or similar:

```sql
    is_guest BOOLEAN DEFAULT false,
```

- [ ] **Step 4: Apply SQL changes to running database**

```bash
docker exec docker-postgres-1 psql -U vidcraft -d vidcraft -c "ALTER TABLE materials ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500); ALTER TABLE materials ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'parsing'; ALTER TABLE materials ADD COLUMN IF NOT EXISTS duration FLOAT; ALTER TABLE materials ADD COLUMN IF NOT EXISTS slices JSONB DEFAULT '[]'; ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;"
```

- [ ] **Step 5: Verify type-check**

```bash
cd backend && npm run type-check
```
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add backend/src/database/entities/material.entity.ts backend/src/database/entities/project.entity.ts scripts/init-db.sql
git commit -m "fix: add missing columns to material and project entities/SQL"
```

---

### Task 2: Enable TypeORM connection in DatabaseModule

**Files:**
- Modify: `backend/src/database/database.module.ts`

- [ ] **Step 1: Rewrite DatabaseModule**

Read `backend/src/database/database.module.ts`. Replace entire file:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { Project } from './entities/project.entity';
import { Material } from './entities/material.entity';
import { Script } from './entities/script.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL', 'postgresql://vidcraft:vidcraft@localhost:5432/vidcraft'),
        entities: [User, Project, Material, Script],
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development' ? ['error', 'warn'] : ['error'],
      }),
    }),
    TypeOrmModule.forFeature([User, Project, Material, Script]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
```

- [ ] **Step 2: Verify type-check and build**

```bash
cd backend && npm run type-check && npm run build
```
Expected: 0 errors

- [ ] **Step 3: Test database connection**

Restart backend and verify:
```
[Nest] Starting Nest application...
[Nest] ...connected to database
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/database/database.module.ts
git commit -m "feat: enable TypeORM PostgreSQL connection in DatabaseModule"
```

---

### Task 3: Migrate AuthService to TypeORM User repository

**Files:**
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.module.ts`

- [ ] **Step 1: Rewrite AuthService**

Read `backend/src/modules/auth/auth.service.ts`. Replace the entire file:

```typescript
import { Injectable, Logger, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { MockStoreService } from '../../common/mock-store.service';
import { EmailService } from './email.service';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly store: MockStoreService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  private issueTokens(user: { id: string; email: string; is_guest: boolean }) {
    const payload = { sub: user.id, email: user.email, role: user.is_guest ? 'guest' : 'user' };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.store.issueRefreshToken(user.id),
    };
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar_url: user.avatarUrl,
      plan_type: user.planType,
      video_quota: user.videoQuota,
      is_guest: user.isGuest ?? false,
    };
  }

  async register(email: string, password: string, confirmPassword: string, nickname?: string) {
    if (password !== confirmPassword) throw new ConflictException('密码不一致');
    if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
      throw new ConflictException('密码至少 8 位，须包含字母与数字');
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException('邮箱已注册');
    if (nickname) {
      const nickUser = await this.userRepo.findOne({ where: { nickname } });
      if (nickUser) throw new ConflictException('用户名已被使用');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.store.storeVerificationCode(email, code, passwordHash, nickname);
    this.emailService.sendVerificationCode(email, code);
    return { verifyPending: true, email };
  }

  async verifyEmail(email: string, code: string) {
    const pending = this.store.consumeVerificationCode(email, code);
    if (!pending) throw new BadRequestException('验证码错误或已过期');
    const user = this.userRepo.create({
      email,
      passwordHash: pending.passwordHash,
      nickname: pending.nickname || email.split('@')[0],
      planType: 'free',
      videoQuota: 3,
    } as User);
    const saved = await this.userRepo.save(user);
    const tokens = this.issueTokens({ id: saved.id, email: saved.email, is_guest: false });
    return { ...tokens, user: this.sanitizeUser(saved) };
  }

  async login(username: string, password: string) {
    let user = await this.userRepo.findOne({ where: { nickname: username } });
    if (!user) user = await this.userRepo.findOne({ where: { email: username } });
    if (!user) throw new UnauthorizedException('用户名或密码错误');
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('用户名或密码错误');
    const tokens = this.issueTokens({ id: user.id, email: user.email, is_guest: false });
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  guestLogin() {
    const guestUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'demo@vidcraft.icu',
      nickname: '体验用户',
      is_guest: true,
      video_quota: 2,
    };
    const tokens = this.issueTokens(guestUser as any);
    return { ...tokens, user: { id: guestUser.id, nickname: guestUser.nickname, is_guest: true, video_quota: guestUser.video_quota } };
  }

  refresh(refreshToken: string) {
    if (this.store.isRefreshTokenBlacklisted(refreshToken))
      throw new UnauthorizedException('Refresh Token 已失效');
    const userId = this.store.getUserIdByRefreshToken(refreshToken);
    if (!userId) throw new UnauthorizedException('Refresh Token 无效或已过期');
    if (userId.startsWith('00000000')) {
      return { accessToken: this.jwtService.sign({ sub: userId, email: 'demo@vidcraft.icu', role: 'guest' }) };
    }
    this.userRepo.findOne({ where: { id: userId } }).then((user) => {
      if (!user) throw new UnauthorizedException('用户不存在');
    });
    return { accessToken: this.jwtService.sign({ sub: userId, email: '', role: 'user' }) };
  }

  logout(refreshToken: string) {
    this.store.blacklistRefreshToken(refreshToken);
    return null;
  }

  async profile(userId: string) {
    if (userId === '00000000-0000-0000-0000-000000000001') {
      return { id: userId, email: 'demo@vidcraft.icu', nickname: '体验用户', avatar_url: null, plan_type: 'free', video_quota: 2, is_guest: true };
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, nickname?: string, avatarUrl?: string) {
    await this.userRepo.update(userId, { nickname, avatarUrl });
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');
    return { nickname: user.nickname, avatar_url: user.avatarUrl };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return { sent: true };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.store.storePasswordResetCode(email, code);
    await this.emailService.sendPasswordResetCode(email, code);
    return { sent: true };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    if (!this.store.consumePasswordResetCode(email, code))
      throw new BadRequestException('验证码错误或已过期');
    if (!newPassword || newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword))
      throw new BadRequestException('密码至少 8 位，须包含字母与数字');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update({ email }, { passwordHash });
    return { reset: true };
  }
}
```

- [ ] **Step 2: Update AuthModule to import TypeORM User entity**

Read `backend/src/modules/auth/auth.module.ts`. Add `TypeOrmModule.forFeature([User])` to imports:

```typescript
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
// ... in @Module:
imports: [TypeOrmModule.forFeature([User]), /* existing imports */],
```

- [ ] **Step 3: Type-check and build**

```bash
cd backend && npm run type-check && npm run build
```
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/auth/auth.service.ts backend/src/modules/auth/auth.module.ts
git commit -m "feat: migrate AuthService to TypeORM User repository"
```

---

### Task 4: Migrate ProjectService to TypeORM

**Files:**
- Modify: `backend/src/modules/project/project.service.ts`
- Modify: `backend/src/modules/project/project.module.ts`

- [ ] **Step 1: Rewrite ProjectService**

Read `backend/src/modules/project/project.service.ts`. Replace with TypeORM repository version:

```typescript
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../database/entities/project.entity';
import { MockStoreService } from '../../common/mock-store.service';

@Injectable()
export class ProjectService {
  constructor(
    private readonly store: MockStoreService,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
  ) {}

  async create(userId: string, input: { name: string; description?: string }) {
    const project = this.projectRepo.create({
      userId,
      name: input.name,
      description: input.description || '',
      status: 'draft',
    });
    const saved = await this.projectRepo.save(project);
    return { id: saved.id, name: saved.name, description: saved.description, status: saved.status, created_at: saved.createdAt.toISOString() };
  }

  async list(userId: string, keyword = '', page = 1, limit = 20, status = 'all') {
    const qb = this.projectRepo.createQueryBuilder('p').where('p.userId = :userId', { userId });
    if (keyword) qb.andWhere('p.name ILIKE :kw', { kw: `%${keyword}%` });
    if (status !== 'all') qb.andWhere('p.status = :status', { status });
    qb.orderBy('p.updatedAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((p) => ({
        id: p.id, name: p.name, cover_url: p.coverUrl, video_count: p.videoCount,
        status: p.status, views: p.views, render_progress: p.renderProgress,
        tiktok_ready: p.tiktokReady, updated_at: p.updatedAt.toISOString(),
      })),
      total,
    };
  }

  async getById(id: string, userId: string) {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权访问该项目');
    return {
      id: project.id, name: project.name, description: project.description,
      product_url: project.productUrl, product_info: project.productInfo,
      cover_url: project.coverUrl, status: project.status,
      material_count: project.materialCount, video_count: project.videoCount,
      render_progress: project.renderProgress, tiktok_ready: project.tiktokReady,
      created_at: project.createdAt.toISOString(), updated_at: project.updatedAt.toISOString(),
    };
  }

  async update(id: string, userId: string, input: Record<string, unknown>) {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权操作该项目');
    await this.projectRepo.update(id, input as any);
    return { id };
  }

  async delete(id: string, userId: string) {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权操作该项目');
    await this.projectRepo.delete(id);
    return { deleted: true };
  }
}
```

- [ ] **Step 2: Update ProjectModule**

Read `backend/src/modules/project/project.module.ts`. Add `TypeOrmModule.forFeature([Project])`:

```typescript
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../../database/entities/project.entity';
// ... imports: [TypeOrmModule.forFeature([Project])]
```

- [ ] **Step 3: Type-check**

```bash
cd backend && npm run type-check
```
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/project/project.service.ts backend/src/modules/project/project.module.ts
git commit -m "feat: migrate ProjectService to TypeORM Project repository"
```

---

### Task 5: Migrate ProductService and MaterialService

**Files:**
- Modify: `backend/src/modules/product/product.service.ts`
- Modify: `backend/src/modules/product/product.module.ts`
- Modify: `backend/src/modules/material/material.service.ts`
- Modify: `backend/src/modules/material/material.module.ts`

- [ ] **Step 1: Rewrite ProductService to use TypeORM + keep MinIO + Volcano**

Read `backend/src/modules/product/product.service.ts`. Update constructor and methods to use `projectRepo`:

The constructor changes to:
```typescript
constructor(
    private readonly store: MockStoreService,
    private readonly volcano: VolcanoApiService,
    private readonly minio: MinioStorageService,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Material) private readonly materialRepo: Repository<Material>,
) {}
```

The `parseImage` method updates project via repository:
```typescript
async parseImage(projectId: string, imageName: string, imageBuffer?: Buffer) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');
    
    const aiResult = await this.volcano.analyzeProductImage(imageName, imageBuffer);
    
    let fileUrl = '';
    if (imageBuffer) {
      const fileExt = imageName.split('.').pop() || 'jpg';
      const key = `projects/${projectId}/products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
      try { fileUrl = await this.minio.uploadFile(key, imageBuffer, 'image/jpeg'); }
      catch (err) { this.logger.warn(`MinIO upload failed: ${(err as Error).message}`); }
    }
    
    const coverUrl = fileUrl || `https://placehold.co/400x600/E2E8F0/475569?text=${encodeURIComponent(aiResult.name)}`;
    const productInfo = { ...aiResult, cover_url: coverUrl };
    
    await this.projectRepo.update(projectId, { productInfo, coverUrl, status: 'material_pending' });
    
    // Create material record
    const material = this.materialRepo.create({
      projectId, fileUrl, fileType: 'image', fileName: imageName, fileSize: imageBuffer?.length || 0,
      analysis: { name: aiResult.name, category: aiResult.category, selling_points: aiResult.selling_points, target_audience: aiResult.target_audience, usage_scene: aiResult.usage_scene, price_anchor: aiResult.price_anchor, cover_url: coverUrl },
      tags: aiResult.selling_points?.slice(0, 5) || [],
      thumbnailUrl: coverUrl, status: 'ready',
    } as Material);
    const savedMaterial = await this.materialRepo.save(material);
    
    return { ...productInfo, material_id: savedMaterial.id };
}
```

Other methods (`parseUrl`, `updateProjectProduct`, `confirm`, `getByProjectId`, `importFromProject`) follow the same pattern — replace `store.*` with `projectRepo.*`.

- [ ] **Step 2: Rewrite MaterialService to use TypeORM**

Read `backend/src/modules/material/material.service.ts`. Replace list/delete methods to use `materialRepo`:

```typescript
async list(userId: string, projectId: string, type = 'all', page = 1, limit = 24) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权访问该项目');
    
    const qb = this.materialRepo.createQueryBuilder('m')
      .where('m.projectId = :projectId', { projectId });
    if (type !== 'all') qb.andWhere('m.fileType = :type', { type });
    qb.orderBy('m.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    
    return {
      items: items.map((m) => ({
        id: m.id, file_type: m.fileType, file_name: m.fileName, file_size: m.fileSize,
        thumbnail_url: m.thumbnailUrl, status: m.status, tags: m.tags,
        duration: m.duration, created_at: m.createdAt.toISOString(), analysis: m.analysis,
      })),
      total,
    };
}

async delete(id: string) {
    await this.materialRepo.delete(id);
    return { deleted: true, referenced_shots: 0 };
}
```

- [ ] **Step 3: Update ProductModule and MaterialModule**

Add `TypeOrmModule.forFeature([Project, Material])` to both modules' imports.

- [ ] **Step 4: Type-check**

```bash
cd backend && npm run type-check
```
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/product/product.service.ts backend/src/modules/product/product.module.ts backend/src/modules/material/material.service.ts backend/src/modules/material/material.module.ts
git commit -m "feat: migrate ProductService and MaterialService to TypeORM"
```

---

### Task 6: Seed demo data and final verification

- [ ] **Step 1: Run seed script**

```bash
docker exec -i docker-postgres-1 psql -U vidcraft -d vidcraft < scripts/seed-demo-data.sql
```

- [ ] **Step 2: Full build and type-check**

```bash
cd backend && npm run type-check && npm run lint && npm run build
```
Expected: 0 errors, 0 new warnings

- [ ] **Step 3: Restart backend and verify**

Check startup logs for TypeORM connection. Upload a product image and verify data persists in PostgreSQL:

```bash
docker exec docker-postgres-1 psql -U vidcraft -d vidcraft -c "SELECT id, file_name, status FROM materials;"
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: seed demo data, final verification of PostgreSQL migration"
```

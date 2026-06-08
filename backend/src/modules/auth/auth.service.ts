import path from 'path';
import { Injectable, Logger, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { MockStoreService } from '../../common/mock-store.service';
import { MinioStorageService } from '../../common/minio-storage.service';
import { EmailService } from './email.service';
import { User } from '../../database/entities/user.entity';

/**
 * 游客 / 演示模式复用 Postgres 中预置的 demo 用户行（见 seed-demo-data.sql 与 DDD §2.1）。
 * 必须与库里真实存在的 users.id 一致，否则游客创建项目会触发 projects_user_id_fkey 外键失败。
 */
export const GUEST_USER_ID = 'a0000000-0000-0000-0000-000000000001';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly store: MockStoreService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly minio: MinioStorageService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return null;
    return user;
  }

  private issueTokens(user: { id: string; email: string; isGuest: boolean }) {
    const payload = { sub: user.id, email: user.email, role: user.isGuest ? 'guest' : 'user' };
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
      is_guest: (user as any).isGuest ?? false,
      preferences: user.preferences ?? {},
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
    const sent = await this.emailService.sendVerificationCode(email, code);
    if (!sent) throw new BadRequestException('验证码发送失败，请稍后重试');
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
    const tokens = this.issueTokens({ id: saved.id, email: saved.email, isGuest: false });
    return { ...tokens, user: this.sanitizeUser(saved) };
  }

  async login(username: string, password: string) {
    let user = await this.userRepo.findOne({ where: { nickname: username } });
    if (!user) user = await this.userRepo.findOne({ where: { email: username } });
    if (!user) throw new UnauthorizedException('用户名或密码错误');
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('用户名或密码错误');
    const tokens = this.issueTokens({ id: user.id, email: user.email, isGuest: false });
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  guestLogin() {
    const guestUser = {
      id: GUEST_USER_ID,
      email: 'demo@vidcraft.icu',
      nickname: '体验用户',
      isGuest: true,
      video_quota: 2,
    };
    const tokens = this.issueTokens(guestUser as any);
    return { ...tokens, user: { id: guestUser.id, nickname: guestUser.nickname, is_guest: true, video_quota: guestUser.video_quota } };
  }

  async refresh(refreshToken: string) {
    if (this.store.isRefreshTokenBlacklisted(refreshToken))
      throw new UnauthorizedException('Refresh Token 已失效');
    const userId = this.store.getUserIdByRefreshToken(refreshToken);
    if (!userId) throw new UnauthorizedException('Refresh Token 无效或已过期');
    if (userId === GUEST_USER_ID) {
      return { accessToken: this.jwtService.sign({ sub: userId, email: 'demo@vidcraft.icu', role: 'guest' }) };
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');
    return { accessToken: this.jwtService.sign({ sub: user.id, email: user.email, role: 'user' }) };
  }

  logout(refreshToken: string) {
    this.store.blacklistRefreshToken(refreshToken);
    return null;
  }

  async profile(userId: string) {
    if (userId === GUEST_USER_ID) {
      return { id: userId, email: 'demo@vidcraft.icu', nickname: '体验用户', avatar_url: null, plan_type: 'free', video_quota: 2, is_guest: true, preferences: {} };
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, nickname?: string, avatarUrl?: string, preferences?: Record<string, unknown>) {
    const updates: Record<string, unknown> = {};
    if (nickname !== undefined) updates.nickname = nickname;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (preferences !== undefined) updates.preferences = preferences;
    if (Object.keys(updates).length > 0) {
      await this.userRepo.update(userId, updates as any);
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');
    return this.sanitizeUser(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, confirmNewPassword: string) {
    if (newPassword !== confirmNewPassword) throw new ConflictException('两次输入的密码不一致');
    if (!newPassword || newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword))
      throw new ConflictException('密码至少 8 位，须包含字母与数字');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) throw new BadRequestException('当前密码错误');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(userId, { passwordHash });

    return { changed: true };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请选择要上传的头像文件');

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('仅支持 JPG/PNG/WebP 格式的头像');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('头像文件不能超过 5MB');
    }

    const ext = path.extname(file.originalname) || '.jpg';
    const key = `avatars/${userId}${ext}`;
    const avatarUrl = await this.minio.uploadFile(key, file.buffer, file.mimetype);
    await this.userRepo.update(userId, { avatarUrl });

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');

    return { avatar_url: user.avatarUrl };
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

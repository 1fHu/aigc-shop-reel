import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { MockStoreService, UserRecord } from '../../common/mock-store.service';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly store: MockStoreService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = this.store.getUserByEmail(email);
    if (!user) {
      return null;
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return null;
    }
    return user;
  }

  private issueTokens(user: { id: string; email: string; is_guest: boolean }) {
    const payload = { sub: user.id, email: user.email, role: user.is_guest ? 'guest' : 'user' };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.store.issueRefreshToken(user.id),
    };
  }

  private sanitizeUser(user: UserRecord | { id: string; nickname?: string; is_guest?: boolean; video_quota?: number }) {
    if (!user) return null;
    return {
      id: user.id,
      email: (user as any).email || undefined,
      nickname: (user as any).nickname || undefined,
      avatar_url: (user as any).avatar_url || undefined,
      plan_type: (user as any).plan_type || undefined,
      video_quota: (user as any).video_quota || undefined,
      is_guest: (user as any).is_guest || false,
    };
  }

  async register(email: string, password: string, confirmPassword: string, nickname?: string) {
    if (password !== confirmPassword) {
      throw new ConflictException('密码不一致');
    }
    if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      throw new ConflictException('密码至少 8 位，须包含字母与数字');
    }
    if (this.store.getUserByEmail(email)) {
      throw new ConflictException('邮箱已注册');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.store.storeVerificationCode(email, code, passwordHash, nickname);
    // 邮件发送非阻塞，失败也允许继续（开发环境终端可见验证码）
    this.emailService.sendVerificationCode(email, code);
    return { verifyPending: true, email };
  }

  async verifyEmail(email: string, code: string) {
    const pending = this.store.consumeVerificationCode(email, code);
    if (!pending) {
      throw new BadRequestException('验证码错误或已过期');
    }
    // 实际创建用户
    const user = this.store.createUser(email, pending.passwordHash, pending.nickname);
    const tokens = this.issueTokens(user);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async login(username: string, password: string) {
    const user = this.store.getUserByNickname(username);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const tokens = this.issueTokens(user);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  guestLogin() {
    const demoUser = this.store.getDemoUser();
    const guestUser = {
      ...demoUser,
      id: '00000000-0000-0000-0000-000000000001',
      nickname: '体验用户',
      is_guest: true,
      video_quota: 2,
    };
    const tokens = this.issueTokens(guestUser);
    return { ...tokens, user: this.sanitizeUser({ id: guestUser.id, nickname: guestUser.nickname, is_guest: true, video_quota: guestUser.video_quota } as any) };
  }

  refresh(refreshToken: string) {
    if (this.store.isRefreshTokenBlacklisted(refreshToken)) {
      throw new UnauthorizedException('Refresh Token 已失效');
    }
    const userId = this.store.getUserIdByRefreshToken(refreshToken);
    if (!userId) {
      throw new UnauthorizedException('Refresh Token 无效或已过期');
    }
    const user = this.store.getUserById(userId);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    return { accessToken: this.jwtService.sign({ sub: user.id, email: user.email, role: user.is_guest ? 'guest' : 'user' }) };
  }

  logout(refreshToken: string) {
    this.store.blacklistRefreshToken(refreshToken);
    return null;
  }

  profile(userId: string) {
    const user = this.store.getUserById(userId);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      plan_type: user.plan_type,
      video_quota: user.video_quota,
      is_guest: user.is_guest,
    };
  }

  updateProfile(userId: string, nickname?: string, avatarUrl?: string) {
    const user = this.store.updateUser(userId, {
      nickname: nickname || undefined,
      avatar_url: avatarUrl || undefined,
    });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    return { nickname: user.nickname, avatar_url: user.avatar_url };
  }

  async forgotPassword(email: string) {
    const user = this.store.getUserByEmail(email);
    if (!user) return { sent: true };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.store.storePasswordResetCode(email, code);
    await this.emailService.sendPasswordResetCode(email, code);
    return { sent: true };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    if (!this.store.consumePasswordResetCode(email, code)) {
      throw new BadRequestException('验证码错误或已过期');
    }
    if (!newPassword || newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      throw new BadRequestException('密码至少 8 位，须包含字母与数字');
    }
    const user = this.store.getUserByEmail(email);
    if (!user) throw new BadRequestException('用户不存在');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    this.store.updateUser(user.id, { password_hash: passwordHash } as any);
    return { reset: true };
  }
}

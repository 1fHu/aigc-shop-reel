import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { MockStoreService, UserRecord } from '../../common/mock-store.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly store: MockStoreService,
    private readonly jwtService: JwtService,
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
      refreshToken: this.store.issueRefreshToken(),
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

  async register(email: string, password: string, confirmPassword: string) {
    if (password !== confirmPassword) {
      throw new ConflictException('密码不一致');
    }
    if (this.store.getUserByEmail(email)) {
      throw new ConflictException('邮箱已注册');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.store.createUser(email, passwordHash);
    const tokens = this.issueTokens(user);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
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
    return { accessToken: this.jwtService.sign({ sub: 'refreshed', email: 'refreshed@vidcraft.icu', role: 'user' }) };
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
}

import { ConflictException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { User } from '../../database/entities/user.entity';
import { RedisService } from '../../redis/redis.service';
import {
  GUEST_ACCESS_TOKEN_TTL_SEC,
  GUEST_REFRESH_TOKEN_TTL_SEC,
  GUEST_USER_EMAIL,
  GUEST_USER_ID,
  GUEST_USER_NICKNAME,
  GUEST_USER_PASSWORD,
  GUEST_VIDEO_QUOTA_PER_SESSION,
  USER_ACCESS_TOKEN_TTL_SEC,
  USER_REFRESH_TOKEN_TTL_SEC,
  isGuestId,
} from './auth.constants';
import { AuthTokensDto, AuthUserDto } from './dto/auth.dto';

interface JwtPayload {
  sub: string;
  email: string;
  is_guest: boolean;
  session_id?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async register(email: string, password: string, confirmPassword: string) {
    if (password !== confirmPassword) {
      throw new ConflictException('密码不一致');
    }
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('邮箱已注册');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({ email, passwordHash, planType: 'free', videoQuota: 3 });
    await this.userRepo.save(user);
    const sessionId = randomBytes(16).toString('hex');
    const accessToken = await this.signAccessToken(
      { sub: user.id, email: user.email, is_guest: false, session_id: sessionId },
      USER_ACCESS_TOKEN_TTL_SEC,
    );
    const refreshToken = `rt-${randomBytes(16).toString('hex')}`;
    await this.storeRefreshToken(refreshToken, { userId: user.id, isGuest: false }, USER_REFRESH_TOKEN_TTL_SEC);
    return { accessToken, refreshToken, user: this.toAuthUserDto(user, false) };
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('邮箱或密码错误');
    }
    const sessionId = randomBytes(16).toString('hex');
    const accessToken = await this.signAccessToken(
      { sub: user.id, email: user.email, is_guest: false, session_id: sessionId },
      USER_ACCESS_TOKEN_TTL_SEC,
    );
    const refreshToken = `rt-${randomBytes(16).toString('hex')}`;
    await this.storeRefreshToken(refreshToken, { userId: user.id, isGuest: false }, USER_REFRESH_TOKEN_TTL_SEC);
    return { accessToken, refreshToken, user: this.toAuthUserDto(user, false) };
  }

  async refresh(refreshToken: string) {
    const raw = await this.redis.get(this.refreshTokenKey(refreshToken));
    if (!raw) {
      throw new UnauthorizedException('Refresh Token 已失效');
    }
    const payload = JSON.parse(raw) as { userId: string; isGuest: boolean; sessionId?: string };
    const user = await this.userRepo.findOne({ where: { id: payload.userId } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    const newSessionId = randomBytes(16).toString('hex');
    const accessTtl = payload.isGuest ? GUEST_ACCESS_TOKEN_TTL_SEC : USER_ACCESS_TOKEN_TTL_SEC;
    const refreshTtl = payload.isGuest ? GUEST_REFRESH_TOKEN_TTL_SEC : USER_REFRESH_TOKEN_TTL_SEC;
    const accessToken = await this.signAccessToken(
      { sub: user.id, email: user.email, is_guest: payload.isGuest, session_id: newSessionId },
      accessTtl,
    );
    const newRefreshToken = `rt-${payload.isGuest ? 'guest-' : ''}${randomBytes(16).toString('hex')}`;
    await this.redis.del(this.refreshTokenKey(refreshToken));
    await this.storeRefreshToken(newRefreshToken, { userId: user.id, isGuest: payload.isGuest, sessionId: newSessionId }, refreshTtl);
    return { accessToken };
  }

  async logout(refreshToken: string) {
    await this.redis.del(this.refreshTokenKey(refreshToken));
    return null;
  }

  async profile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    return this.toAuthUserDto(user, isGuestId(userId));
  }

  async updateProfile(userId: string, nickname?: string, avatarUrl?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    if (nickname !== undefined) user.nickname = nickname;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    await this.userRepo.save(user);
    return { nickname: user.nickname, avatar_url: user.avatarUrl };
  }

  private toAuthUserDto(user: User, isGuest: boolean): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname || GUEST_USER_NICKNAME,
      avatar_url: user.avatarUrl ?? null,
      plan_type: user.planType,
      video_quota: user.videoQuota,
      is_guest: isGuest,
    };
  }
    const guest = await this.ensureGuestUser();
    const sessionId = randomBytes(16).toString('hex');

    const accessToken = await this.signAccessToken(
      { sub: guest.id, email: guest.email, is_guest: true, session_id: sessionId },
      GUEST_ACCESS_TOKEN_TTL_SEC,
    );

    const refreshToken = `rt-guest-${randomBytes(16).toString('hex')}`;
    await this.storeRefreshToken(refreshToken, {
      userId: guest.id,
      isGuest: true,
      sessionId,
    }, GUEST_REFRESH_TOKEN_TTL_SEC);

    await this.initGuestSessionQuota(sessionId);

    const user: AuthUserDto = {
      id: guest.id,
      email: guest.email,
      nickname: guest.nickname || GUEST_USER_NICKNAME,
      avatar_url: guest.avatarUrl ?? null,
      plan_type: guest.planType,
      video_quota: GUEST_VIDEO_QUOTA_PER_SESSION,
      is_guest: true,
      quota: GUEST_VIDEO_QUOTA_PER_SESSION,
    };

    this.logger.log(`Guest login: session=${sessionId} userId=${guest.id}`);

    return { accessToken, refreshToken, user };
  }

  /**
   * Idempotently provision the demo user row.
   * Per DB doc, M0 guest mode reuses a single preset row keyed by UUID.
   */
  private async ensureGuestUser(): Promise<User> {
    let user = await this.userRepo.findOne({ where: { id: GUEST_USER_ID } });
    if (user) return user;

    const passwordHash = await bcrypt.hash(GUEST_USER_PASSWORD, 10);
    user = this.userRepo.create({
      id: GUEST_USER_ID,
      email: GUEST_USER_EMAIL,
      passwordHash,
      nickname: GUEST_USER_NICKNAME,
      planType: 'free',
      videoQuota: 3,
    });
    await this.userRepo.save(user);
    this.logger.log(`Provisioned demo user ${GUEST_USER_ID}`);
    return user;
  }

  private async signAccessToken(payload: JwtPayload, expiresInSec: number): Promise<string> {
    const secret = this.configService.get<string>('jwt.secret', 'dev-secret');
    return this.jwtService.signAsync(payload, { secret, expiresIn: expiresInSec });
  }

  private refreshTokenKey(refreshToken: string): string {
    return `auth:refresh:${refreshToken}`;
  }

  private guestSessionQuotaKey(sessionId: string): string {
    return `auth:guest:quota:${sessionId}`;
  }

  private async storeRefreshToken(
    refreshToken: string,
    payload: { userId: string; isGuest: boolean; sessionId?: string },
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.set(this.refreshTokenKey(refreshToken), JSON.stringify(payload), ttlSeconds);
  }

  private async initGuestSessionQuota(sessionId: string): Promise<void> {
    await this.redis.set(
      this.guestSessionQuotaKey(sessionId),
      String(GUEST_VIDEO_QUOTA_PER_SESSION),
      GUEST_REFRESH_TOKEN_TTL_SEC,
    );
  }

  /**
   * Atomically consume 1 guest video quota. Throws 403 if exhausted.
   * Used by /api/videos/generate guard.
   */
  async consumeGuestQuota(sessionId: string): Promise<number> {
    const key = this.guestSessionQuotaKey(sessionId);
    const remaining = Number(
      await this.redis.getClient().eval(
        `
          local current = redis.call('GET', KEYS[1])
          if not current then
            return -1
          end

          local quota = tonumber(current)
          if not quota or quota <= 0 then
            return -1
          end

          return redis.call('DECR', KEYS[1])
        `,
        1,
        key,
      ),
    );

    if (remaining < 0) {
      throw new ForbiddenException('游客会话视频生成配额已耗尽（每会话 2 条）');
    }
    return remaining;
  }

  async getGuestQuotaRemaining(sessionId: string): Promise<number> {
    const raw = await this.redis.get(this.guestSessionQuotaKey(sessionId));
    if (raw === null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(n, 0) : 0;
}

/**
 * Guest accounts are blocked from sensitive actions:
 * ① 修改密码  ② 删除预置演示数据  ③ 修改邮箱
 */
assertNotGuest(userId: string, action = '该操作'): void {
  if (isGuestId(userId)) {
    throw new ForbiddenException(`游客账号不支持${action}，请注册正式账号`);
  }
}
}

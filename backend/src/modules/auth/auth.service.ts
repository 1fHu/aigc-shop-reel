import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
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

  async guestLogin(): Promise<AuthTokensDto> {
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
    const remaining = await this.redis.getClient().decr(key);
    if (remaining < 0) {
      await this.redis.getClient().incr(key);
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

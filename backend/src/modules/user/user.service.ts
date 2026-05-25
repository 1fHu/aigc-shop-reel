import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MockStoreService } from '../../common/mock-store.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly store: MockStoreService) {}

  getProfile(userId: string) {
    const user = this.store.getUserById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
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
}

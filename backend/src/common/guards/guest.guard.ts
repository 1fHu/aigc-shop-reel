import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../modules/auth/jwt.strategy';

export const ALLOW_GUEST = 'allow_guest';

/**
 * BlockGuestGuard
 *
 * Use on endpoints where guests must NOT pass (修改密码、删除预置数据、
 * 邮箱变更等). Pair with JwtAuthGuard; the JWT must already be validated.
 *
 * Default behavior: block guest. To explicitly allow on a route, decorate
 * with @AllowGuest().
 */
@Injectable()
export class BlockGuestGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allow = this.reflector.getAllAndOverride<boolean>(ALLOW_GUEST, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allow) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthenticatedUser | undefined;
    if (user?.isGuest) {
      throw new ForbiddenException('游客账号不可执行该操作，请注册正式账号');
    }
    return true;
  }
}

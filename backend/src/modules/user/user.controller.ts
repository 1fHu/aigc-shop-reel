import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { ok } from '../../common/api-response';

@Controller('api/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() request: { user: { id: string } }) {
    return ok(this.userService.getProfile(request.user.id));
  }
}

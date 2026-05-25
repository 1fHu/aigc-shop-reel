import { Body, Controller, Post, Get, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ok } from '../../common/api-response';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('guest-login')
  guestLogin() {
    return ok(this.authService.guestLogin());
  }

  @Post('register')
  async register(@Body() body: { email: string; password: string; confirmPassword: string }) {
    const result = await this.authService.register(body.email, body.password, body.confirmPassword);
    return ok(result);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const result = await this.authService.login(body.email, body.password);
    return ok(result);
  }

  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) {
    return ok(this.authService.refresh(body.refreshToken));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  logout(@Body() body: { refreshToken: string }) {
    return ok(this.authService.logout(body.refreshToken));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  profile(@Req() request: { user: { id: string } }) {
    return ok(this.authService.profile(request.user.id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  updateProfile(@Req() request: { user: { id: string } }, @Body() body: { nickname?: string; avatar?: string }) {
    return ok(this.authService.updateProfile(request.user.id, body.nickname, body.avatar));
  }
}

import { Body, Controller, Post, Get, Put, Req, UseGuards, UseInterceptors, UploadedFile, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { ok } from '../../common/api-response';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(200)
  @Post('guest-login')
  guestLogin() {
    return ok(this.authService.guestLogin());
  }

  @HttpCode(200)
  @Post('register')
  async register(@Body() body: { email: string; password: string; confirmPassword: string; nickname?: string }) {
    const result = await this.authService.register(body.email, body.password, body.confirmPassword, body.nickname);
    return ok(result);
  }

  @HttpCode(200)
  @Post('verify-email')
  async verifyEmail(@Body() body: { email: string; code: string }) {
    return ok(await this.authService.verifyEmail(body.email, body.code));
  }

  @HttpCode(200)
  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const result = await this.authService.login(body.username, body.password);
    return ok(result);
  }

  @HttpCode(200)
  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) {
    return ok(this.authService.refresh(body.refreshToken));
  }

  @HttpCode(200)
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
  updateProfile(@Req() request: { user: { id: string } }, @Body() body: { nickname?: string; avatar?: string; preferences?: Record<string, unknown> }) {
    return ok(this.authService.updateProfile(request.user.id, body.nickname, body.avatar, body.preferences));
  }

  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  @Put('password')
  changePassword(@Req() request: { user: { id: string } }, @Body() body: { currentPassword: string; newPassword: string; confirmNewPassword: string }) {
    return ok(this.authService.changePassword(request.user.id, body.currentPassword, body.newPassword, body.confirmNewPassword));
  }

  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(200)
  @Post('avatar')
  uploadAvatar(@Req() request: { user: { id: string } }, @UploadedFile() file: Express.Multer.File) {
    return ok(this.authService.uploadAvatar(request.user.id, file));
  }

  @HttpCode(200)
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return ok(await this.authService.forgotPassword(body.email));
  }

  @HttpCode(200)
  @Post('reset-password')
  async resetPassword(@Body() body: { email: string; code: string; newPassword: string }) {
    return ok(await this.authService.resetPassword(body.email, body.code, body.newPassword));
  }
}

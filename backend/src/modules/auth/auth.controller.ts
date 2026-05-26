import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthTokensDto } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('guest-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '游客一键登录',
    description: '无需任何参数。返回有效期 2 小时的 Access Token、24 小时的 Refresh Token，会话内可触发 2 次视频生成。',
  })
  @ApiResponse({ status: 200, description: '登录成功', type: AuthTokensDto })
  async guestLogin(): Promise<AuthTokensDto> {
    return this.authService.guestLogin();
  }

  @Post('register')
  async register(@Body() body: { email: string; password: string; confirmPassword: string }) {
    return this.authService.register(body.email, body.password, body.confirmPassword);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(@Body() body: { refreshToken: string }) {
    return this.authService.logout(body.refreshToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async profile(@Req() request: { user: { id: string } }) {
    return this.authService.profile(request.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  async updateProfile(@Req() request: { user: { id: string } }, @Body() body: { nickname?: string; avatar?: string }) {
    return this.authService.updateProfile(request.user.id, body.nickname, body.avatar);
  }
}

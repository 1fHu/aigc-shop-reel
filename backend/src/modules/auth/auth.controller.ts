import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
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
}

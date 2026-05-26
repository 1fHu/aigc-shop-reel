import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: 'a0000000-0000-0000-0000-000000000001' })
  id!: string;

  @ApiProperty({ example: 'demo@vidcraft.io', required: false, nullable: true })
  email?: string | null;

  @ApiProperty({ example: '体验用户' })
  nickname!: string;

  @ApiProperty({ example: null, required: false, nullable: true })
  avatar_url?: string | null;

  @ApiProperty({ example: 'free', enum: ['free', 'pro'] })
  plan_type!: string;

  @ApiProperty({ example: 2 })
  video_quota!: number;

  @ApiProperty({ example: true })
  is_guest!: boolean;

  @ApiProperty({ example: 2, description: '本次会话剩余配额（仅游客）', required: false })
  quota?: number;
}

export class AuthTokensDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'rt-guest-xxxxxxxxxxxxxxxx' })
  refreshToken!: string;

  @ApiProperty({ type: () => AuthUserDto })
  user!: AuthUserDto;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

// ──── Request DTOs with validation ────

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email!: string;

  @ApiProperty({ example: 'Abc123456!' })
  @IsString()
  @MinLength(8, { message: '密码至少 8 个字符' })
  @MaxLength(64, { message: '密码不能超过 64 个字符' })
  password!: string;

  @ApiProperty({ example: 'Abc123456!' })
  @IsString()
  @MinLength(8, { message: '确认密码至少 8 个字符' })
  confirmPassword!: string;

  @ApiProperty({ example: '我的昵称', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: '昵称至少 1 个字符' })
  @MaxLength(30, { message: '昵称不能超过 30 个字符' })
  nickname?: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty({ message: '验证码不能为空' })
  code!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username!: string;

  @ApiProperty({ example: 'Abc123456!' })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password!: string;
}

export class RefreshDto {
  @ApiProperty({ example: 'rt-guest-xxxxxxxxxxxxxxxx' })
  @IsString()
  @IsNotEmpty({ message: 'refreshToken 不能为空' })
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty({ message: '验证码不能为空' })
  code!: string;

  @ApiProperty({ example: 'NewPass123!' })
  @IsString()
  @MinLength(8, { message: '新密码至少 8 个字符' })
  @MaxLength(64, { message: '新密码不能超过 64 个字符' })
  newPassword!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPass123!' })
  @IsString()
  @IsNotEmpty({ message: '当前密码不能为空' })
  currentPassword!: string;

  @ApiProperty({ example: 'NewPass456!' })
  @IsString()
  @MinLength(8, { message: '新密码至少 8 个字符' })
  @MaxLength(64, { message: '新密码不能超过 64 个字符' })
  newPassword!: string;

  @ApiProperty({ example: 'NewPass456!' })
  @IsString()
  confirmNewPassword!: string;
}

export class UpdateProfileDto {
  @ApiProperty({ example: '新昵称', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: '昵称至少 1 个字符' })
  @MaxLength(30, { message: '昵称不能超过 30 个字符' })
  nickname?: string;

  @ApiProperty({ example: 'https://example.com/avatar.png', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  preferences?: Record<string, unknown>;
}

// ──── Response DTOs (Swagger) ────

export class AuthUserDto {
  @ApiProperty({ example: 'a0000000-0000-0000-0000-000000000001' })
  id!: string;

  @ApiProperty({ example: 'demo@vidcraft.icu', required: false, nullable: true })
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

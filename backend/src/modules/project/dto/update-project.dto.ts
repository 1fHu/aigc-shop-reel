import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: '项目名称至少 2 个字符' })
  @MaxLength(50, { message: '项目名称不能超过 50 个字符' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '项目描述不能超过 200 个字符' })
  description?: string;
}

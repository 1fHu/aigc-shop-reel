import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: '夏季防晒霜推广', description: '项目名称，2–50 字符' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: '项目名称至少 2 个字符' })
  @MaxLength(50, { message: '项目名称不能超过 50 个字符' })
  name!: string;

  @ApiProperty({ example: '夏季爆款推广项目', description: '项目描述，≤200 字符', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '项目描述不能超过 200 个字符' })
  description?: string;
}

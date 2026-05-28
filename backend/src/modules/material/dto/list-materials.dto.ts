import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListMaterialsDto {
  @ApiProperty({ example: 'proj-001', description: '项目 UUID' })
  @IsString()
  @IsNotEmpty({ message: 'project_id 不能为空' })
  project_id!: string;

  @ApiProperty({ required: false, enum: ['image', 'video', 'all'], default: 'all', description: '文件类型筛选' })
  @IsOptional()
  @IsIn(['image', 'video', 'all'], { message: 'type 只能是 image / video / all' })
  type?: string = 'all';

  @ApiProperty({ required: false, default: 1, description: '页码' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 24, description: '每页条数' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 24;
}

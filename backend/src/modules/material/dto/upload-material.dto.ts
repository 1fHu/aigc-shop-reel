import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UploadMaterialDto {
  @ApiProperty({ example: 'proj-001', description: '所属项目 UUID' })
  @IsString()
  @IsNotEmpty({ message: 'project_id 不能为空' })
  project_id!: string;
}

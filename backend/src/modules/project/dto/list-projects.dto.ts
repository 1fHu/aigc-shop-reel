import { IsOptional, IsString, IsInt, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListProjectsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  keyword?: string = '';

  @IsOptional()
  @IsIn(['draft', 'confirmed', 'material_pending', 'script_pending', 'video_pending', 'finished', 'in_progress', 'completed', 'all'])
  status?: string = 'all';
}

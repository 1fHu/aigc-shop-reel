import { IsNotEmpty, IsString } from 'class-validator';

/**
 * GET /api/videos?project_id= 查询参数
 * 取某项目「已有的最新视频」，用于前端进入视频页判断是否可直接播放。
 */
export class GetProjectVideoDto {
  @IsString()
  @IsNotEmpty({ message: 'project_id 不能为空' })
  project_id!: string;
}

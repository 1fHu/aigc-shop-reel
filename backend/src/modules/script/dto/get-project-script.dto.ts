import { IsNotEmpty, IsString } from 'class-validator';

/**
 * GET /api/scripts?project_id= 查询参数
 * 取某项目「已有的最新剧本」，用于前端进入剧本编辑页时直接回显，而非永远显示空态。
 */
export class GetProjectScriptDto {
  @IsString()
  @IsNotEmpty({ message: 'project_id 不能为空' })
  project_id!: string;
}

import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteProjectDto {
  @IsString()
  @IsNotEmpty({ message: '请输入项目名称以确认删除' })
  confirm_name!: string;
}

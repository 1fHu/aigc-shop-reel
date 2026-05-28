import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const PRODUCT_CATEGORIES = [
  'fashion',
  'beauty',
  'home',
  'electronics',
  'food',
  'sports',
  'mother_baby',
  'pet',
  'other',
] as const;

export class UpdateProductDto {
  @ApiProperty({ example: 'XX SPF50+ 防晒霜 50ml', description: '商品名称' })
  @IsString()
  @IsNotEmpty({ message: '商品名称不能为空' })
  @MaxLength(200, { message: '商品名称不能超过 200 个字符' })
  name!: string;

  @ApiProperty({ example: 'beauty', description: '品类，枚举值见附录 A', enum: PRODUCT_CATEGORIES })
  @IsIn(PRODUCT_CATEGORIES, { message: '品类不在允许的枚举范围内' })
  category!: string;

  @ApiProperty({ example: ['SPF50+ PA++++', '轻薄不油腻'], description: '核心卖点，≤5 条' })
  @IsArray()
  @ArrayNotEmpty({ message: '请至少填写一条核心卖点' })
  @ArrayMaxSize(5, { message: '核心卖点最多 5 条' })
  @IsString({ each: true })
  selling_points!: string[];

  @ApiProperty({ example: '18-30岁都市女性', description: '目标人群', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '目标人群描述不能超过 200 个字符' })
  target_audience?: string;

  @ApiProperty({ example: '户外运动/日常出行', description: '使用场景', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '使用场景描述不能超过 200 个字符' })
  usage_scene?: string;

  @ApiProperty({ example: '原价¥199，现¥89', description: '价格锚点', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '价格锚点不能超过 100 个字符' })
  price_anchor?: string;
}

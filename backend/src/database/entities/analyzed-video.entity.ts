import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 已拆解视频 Entity
 * 用户上传视频文件，AI 自动拆解分析创作手法
 */
@Entity('analyzed_videos')
export class AnalyzedVideo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  // 视频基础信息
  @Column()
  title: string;

  @Column({ name: 'original_filename' })
  originalFilename: string; // 原始文件名

  @Column({ name: 'video_path' })
  videoPath: string; // 本地存储路径

  @Column({ name: 'thumbnail_path', nullable: true })
  thumbnailPath: string; // 缩略图路径

  @Column({ type: 'int', nullable: true })
  duration: number; // 视频时长（秒）

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number; // 文件大小（字节）

  // 拆解状态
  @Column({ default: 'pending' })
  status: 'pending' | 'analyzing' | 'completed' | 'failed';

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  // AI 拆解结果
  @Column({ type: 'json', nullable: true })
  analysis: {
    hook: {
      time_range: string; // 时间范围（如 "00:00 — 00:03"）
      content: string; // Hook 内容描述
    };
    selling_points: string[]; // 卖点列表
    pacing: string; // 节奏分析
    style: string; // 风格分析
  };

  // 创作因子（映射到 genebank 的 5 个维度）
  @Column({ name: 'creative_factors', type: 'json', nullable: true })
  creativeFactors: {
    visual_style: string; // 视觉风格
    opener: string; // 开场手法
    narration: string; // 旁白风格
    pacing: string; // 节奏
    cta: string; // 行动号召
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

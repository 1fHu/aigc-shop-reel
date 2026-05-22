import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Video } from './video.entity';

@Entity('video_metrics')
export class VideoMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true, name: 'video_id' })
  videoId: string;

  @OneToOne(() => Video, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'video_id' })
  video: Video;

  @Column({ type: 'int', default: 0 })
  views: number;

  @Column({ type: 'float', nullable: true, name: 'completion_rate' })
  completionRate: number;

  @Column({ type: 'float', nullable: true, name: 'click_rate' })
  clickRate: number;

  @Column({ type: 'float', nullable: true, name: 'conversion_rate' })
  conversionRate: number;

  @Column({ type: 'float', nullable: true })
  gmv: number;

  @Column({ type: 'jsonb', nullable: true, name: 'watch_time_distribution' })
  watchTimeDistribution: object;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

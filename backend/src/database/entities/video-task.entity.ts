import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Video } from './video.entity';

@Entity('video_tasks')
export class VideoTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'video_id' })
  videoId: string;

  @ManyToOne(() => Video, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'video_id' })
  video: Video;

  @Column({ type: 'int', name: 'shot_index' })
  shotIndex: number;

  @Column({ type: 'varchar', nullable: true, name: 'seedance_task_id' })
  seedanceTaskId: string;

  @Column({ type: 'varchar', default: 'queued' })
  status: string;

  @Column({ type: 'int', default: 0, name: 'retry_count' })
  retryCount: number;

  @Column({ type: 'text', nullable: true, name: 'error_msg' })
  errorMsg: string;

  @Column({ type: 'varchar', nullable: true, name: 'trace_id' })
  traceId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

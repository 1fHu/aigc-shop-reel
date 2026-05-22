import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Video } from './video.entity';

@Entity('diagnosis_reports')
export class DiagnosisReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'video_id' })
  videoId: string;

  @ManyToOne(() => Video, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'video_id' })
  video: Video;

  @Column({ type: 'jsonb', nullable: true })
  issues: object;

  @Column({ type: 'jsonb', nullable: true })
  suggestions: object;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

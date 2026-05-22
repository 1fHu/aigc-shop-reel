import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from './project.entity';
import { Script } from './script.entity';

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'uuid', nullable: true, name: 'script_id' })
  scriptId: string;

  @ManyToOne(() => Script)
  @JoinColumn({ name: 'script_id' })
  script: Script;

  @Column({ type: 'varchar', nullable: true, name: 'video_url' })
  videoUrl: string;

  @Column({ type: 'float', nullable: true })
  duration: number;

  @Column({ type: 'varchar', nullable: true })
  resolution: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  @Column({ type: 'varchar', nullable: true, name: 'trace_id' })
  traceId: string;

  @Column({ type: 'float', nullable: true, name: 'generation_cost' })
  generationCost: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

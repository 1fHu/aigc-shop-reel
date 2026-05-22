import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from './project.entity';

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'varchar', name: 'file_url' })
  fileUrl: string;

  @Column({ type: 'varchar', name: 'file_type' })
  fileType: string;

  @Column({ type: 'varchar', nullable: true, name: 'file_name' })
  fileName: string;

  @Column({ type: 'int', nullable: true, name: 'file_size' })
  fileSize: number;

  @Column({ type: 'jsonb', nullable: true })
  analysis: object;

  @Column({ type: 'varchar', nullable: true })
  embedding: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

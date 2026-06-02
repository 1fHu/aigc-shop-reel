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

  // 列在库里是 pgvector vector(1024)，TypeORM 当 varchar 字符串读写；无向量时存 NULL
  // （pgvector 不接受空向量 '[]'，否则报 "vector must have at least 1 dimension"）
  @Column({ type: 'varchar', nullable: true })
  embedding: string | null;

  @Column({ type: 'text', array: true, nullable: true, default: '{}' })
  tags: string[];

  @Column({ type: 'varchar', nullable: true, name: 'thumbnail_url' })
  thumbnailUrl: string | null;

  @Column({ type: 'varchar', default: 'parsing' })
  status: string;

  @Column({ type: 'float', nullable: true })
  duration: number;

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  slices: object;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

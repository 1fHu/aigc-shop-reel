import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('viral_library')
export class ViralLibrary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, name: 'source_url' })
  sourceUrl: string;

  @Column({ type: 'varchar', nullable: true })
  platform: string;

  @Column({ type: 'timestamp', default: () => 'NOW()', name: 'declared_at' })
  declaredAt: Date;

  @Column({ type: 'varchar', nullable: true })
  title: string;

  @Column({ type: 'varchar', nullable: true, name: 'thumbnail_url' })
  thumbnailUrl: string;

  @Column({ type: 'jsonb', nullable: true, name: 'analysis_report' })
  analysisReport: object;

  @Column({ type: 'varchar', nullable: true })
  embedding: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

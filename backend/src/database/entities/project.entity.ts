import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', nullable: true, name: 'product_url' })
  productUrl: string;

  @Column({ type: 'jsonb', nullable: true, name: 'product_info' })
  productInfo: object;

  @Column({ type: 'varchar', nullable: true, name: 'cover_url' })
  coverUrl: string;

  @Column({ type: 'varchar', default: 'draft' })
  status: string;

  @Column({ type: 'int', default: 0, name: 'material_count' })
  materialCount: number;

  @Column({ type: 'int', default: 0, name: 'script_count' })
  scriptCount: number;

  @Column({ type: 'int', default: 0, name: 'video_count' })
  videoCount: number;

  @Column({ type: 'int', default: 0 })
  views: number;

  @Column({ type: 'int', default: 0, name: 'render_progress' })
  renderProgress: number;

  @Column({ type: 'boolean', default: false, name: 'tiktok_ready' })
  tiktokReady: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

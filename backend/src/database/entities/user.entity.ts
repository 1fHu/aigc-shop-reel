import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', nullable: true })
  nickname: string;

  @Column({ type: 'varchar', nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  @Column({ type: 'varchar', default: 'free', name: 'plan_type' })
  planType: string;

  @Column({ type: 'int', default: 3, name: 'video_quota' })
  videoQuota: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Material } from './material.entity';

@Entity('material_slices')
export class MaterialSlice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'material_id' })
  materialId: string;

  @ManyToOne(() => Material, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @Column({ type: 'float', name: 'start_sec' })
  startSec: number;

  @Column({ type: 'float', name: 'end_sec' })
  endSec: number;

  @Column({ type: 'varchar', nullable: true, name: 'thumbnail_url' })
  thumbnailUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  tags: object;

  @Column({ type: 'varchar', nullable: true })
  embedding: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

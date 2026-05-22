import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('viral_genes')
export class ViralGene {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  category: string;

  @Column({ type: 'jsonb', nullable: true, name: 'storyboard_structure' })
  storyboardStructure: object;

  @Column({ type: 'float', nullable: true, name: 'performance_score' })
  performanceScore: number;

  @Column({ type: 'varchar', nullable: true })
  embedding: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { VolcanoModule } from '../volcano/volcano.module';
import { Project } from '../../database/entities/project.entity';
import { Material } from '../../database/entities/material.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Material]), VolcanoModule],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}

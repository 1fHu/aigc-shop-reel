import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { MaterialController } from './material.controller';
import { MaterialService } from './material.service';
import { Material } from '../../database/entities/material.entity';
import { Project } from '../../database/entities/project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Material, Project]),
    BullModule.registerQueue({ name: 'material-analysis' }),
  ],
  controllers: [MaterialController],
  providers: [MaterialService],
  exports: [MaterialService],
})
export class MaterialModule {}

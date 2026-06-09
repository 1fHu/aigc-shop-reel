import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScriptController } from './script.controller';
import { FactorsController } from './factors.controller';
import { ScriptService } from './script.service';
import { DirectorAgentService } from './director-agent.service';
import { Script } from '../../database/entities/script.entity';
import { Project } from '../../database/entities/project.entity';
import { Material } from '../../database/entities/material.entity';
import { GeneBankModule } from '../gene-bank/gene-bank.module';
import { VolcanoModule } from '../volcano/volcano.module';

@Module({
  imports: [TypeOrmModule.forFeature([Script, Project, Material]), GeneBankModule, VolcanoModule],
  controllers: [ScriptController, FactorsController],
  providers: [ScriptService, DirectorAgentService],
  exports: [ScriptService, DirectorAgentService],
})
export class ScriptModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScriptController } from './script.controller';
import { FactorsController } from './factors.controller';
import { ScriptService } from './script.service';
import { DirectorAgentService } from './director-agent.service';
import { Script } from '../../database/entities/script.entity';
import { Project } from '../../database/entities/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Script, Project])],
  controllers: [ScriptController, FactorsController],
  providers: [ScriptService, DirectorAgentService],
  exports: [ScriptService, DirectorAgentService],
})
export class ScriptModule {}

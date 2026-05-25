import { Module } from '@nestjs/common';
import { ScriptController } from './script.controller';
import { FactorsController } from './factors.controller';
import { ScriptService } from './script.service';
import { DirectorAgentService } from './director-agent.service';

@Module({
  imports: [],
  controllers: [ScriptController, FactorsController],
  providers: [ScriptService, DirectorAgentService],
  exports: [ScriptService, DirectorAgentService],
})
export class ScriptModule {}

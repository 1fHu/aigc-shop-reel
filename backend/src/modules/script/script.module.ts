import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Script } from '../../database/entities/script.entity';
import { ScriptController } from './script.controller';
import { ScriptService } from './script.service';
import { DirectorAgentService } from './director-agent.service';

@Module({
  imports: [TypeOrmModule.forFeature([Script])],
  controllers: [ScriptController],
  providers: [ScriptService, DirectorAgentService],
  exports: [ScriptService, DirectorAgentService],
})
export class ScriptModule {}

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MaterialController } from './material.controller';
import { MaterialService } from './material.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'material-analysis' })],
  controllers: [MaterialController],
  providers: [MaterialService],
  exports: [MaterialService],
})
export class MaterialModule {}

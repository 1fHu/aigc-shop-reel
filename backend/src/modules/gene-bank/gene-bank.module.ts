import { Module } from '@nestjs/common';
import { GeneBankController } from './gene-bank.controller';
import { GeneBankService } from './gene-bank.service';

@Module({
  imports: [],
  controllers: [GeneBankController],
  providers: [GeneBankService],
  exports: [GeneBankService],
})
export class GeneBankModule {}

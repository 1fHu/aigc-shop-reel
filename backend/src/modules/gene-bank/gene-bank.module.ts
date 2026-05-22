import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ViralGene } from '../../database/entities/viral-gene.entity';
import { FactorDefinition } from '../../database/entities/factor-definition.entity';
import { GeneBankController } from './gene-bank.controller';
import { GeneBankService } from './gene-bank.service';

@Module({
  imports: [TypeOrmModule.forFeature([ViralGene, FactorDefinition])],
  controllers: [GeneBankController],
  providers: [GeneBankService],
  exports: [GeneBankService],
})
export class GeneBankModule {}

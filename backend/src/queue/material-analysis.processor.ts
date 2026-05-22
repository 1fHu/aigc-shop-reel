import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('material-analysis')
export class MaterialAnalysisProcessor {
  private readonly logger = new Logger(MaterialAnalysisProcessor.name);

  @Process()
  async process(job: Job): Promise<void> {
    // TODO: implement material AI analysis
    this.logger.log(`Processing material analysis job ${job.id}`);
  }
}

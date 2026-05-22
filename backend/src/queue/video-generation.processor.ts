import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('video-generation')
export class VideoGenerationProcessor {
  private readonly logger = new Logger(VideoGenerationProcessor.name);

  @Process()
  async process(job: Job): Promise<void> {
    // TODO: implement video generation task processing
    this.logger.log(`Processing job ${job.id} with traceId ${job.data.traceId}`);
  }
}

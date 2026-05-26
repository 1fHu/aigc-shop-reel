import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class VolcanoApiService {
  private readonly logger = new Logger(VolcanoApiService.name);

  signCallback(taskId: string, secret: string) {
    this.logger.log(`Signing callback for ${taskId}`);
    return Buffer.from(`${taskId}:${secret}`).toString('hex');
  }
}

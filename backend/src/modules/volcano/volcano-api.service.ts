import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class VolcanoApiService {
  private readonly logger = new Logger(VolcanoApiService.name);
  // TODO: implement Volcano Engine API integration (ARK, veImageX, etc.)
}

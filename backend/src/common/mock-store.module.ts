import { Global, Module } from '@nestjs/common';
import { MockStoreService } from './mock-store.service';

@Global()
@Module({
  providers: [MockStoreService],
  exports: [MockStoreService],
})
export class MockStoreModule {}
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MockStoreService } from '../../common/mock-store.service';

@Injectable()
export class GeneBankService {
  private readonly logger = new Logger(GeneBankService.name);

  constructor(private readonly store: MockStoreService) {}

  search(category?: string, keyword?: string, vectorQuery?: string, limit = 10) {
    return this.store.searchGenes(category, keyword, vectorQuery, limit);
  }

  getById(id: string) {
    const gene = this.store.getGene(id);
    if (!gene) {
      throw new NotFoundException('基因不存在');
    }
    return gene;
  }
}

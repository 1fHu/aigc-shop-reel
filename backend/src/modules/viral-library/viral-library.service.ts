import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MockStoreService } from '../../common/mock-store.service';

@Injectable()
export class ViralLibraryService {
  private readonly logger = new Logger(ViralLibraryService.name);

  constructor(private readonly store: MockStoreService) {}

  search(keyword = '', category?: string, platform = 'all', sortBy = 'created_at', sortOrder: 'asc' | 'desc' = 'desc', limit = 12) {
    return this.store.searchViralLibrary(keyword, category, platform, sortBy, sortOrder, limit);
  }

  importUrl(url: string, category?: string) {
    return this.store.importViralLibrary(url, category);
  }

  uploadAnalyze(title?: string, category?: string) {
    return this.store.uploadAnalyzeViralLibrary(title, category);
  }

  getById(id: string) {
    const item = this.store.getViralLibrary(id);
    if (!item) {
      throw new NotFoundException('视频库条目不存在');
    }
    return item;
  }

  reference(id: string, scriptId: string) {
    const result = this.store.referenceViralLibrary(id, scriptId);
    if (!result) {
      throw new NotFoundException('条目或剧本不存在');
    }
    return result;
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MockStoreService } from '../../common/mock-store.service';
import { DirectorAgentService } from './director-agent.service';

@Injectable()
export class ScriptService {
  private readonly logger = new Logger(ScriptService.name);

  constructor(
    private readonly store: MockStoreService,
    private readonly director: DirectorAgentService,
  ) {}

  /**
   * 生成剧本：由导演 Agent 基于项目商品信息 + 创作策略生成多分镜，再落库。
   * 项目不存在抛 404。
   */
  async generate(projectId: string, strategyType: string) {
    const project = this.store.getProject(projectId);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    const productInfo = (project.product_info ?? {}) as Record<string, unknown>;
    const storyboard = await this.director.generateStoryboard(productInfo, strategyType);
    return this.store.createScript(projectId, strategyType, storyboard);
  }

  getById(id: string) {
    const script = this.store.getScript(id);
    if (!script) {
      throw new NotFoundException('剧本不存在');
    }
    return script;
  }

  saveStoryboard(id: string, storyboard: Array<{ index: number; description: string; camera_motion: string; duration: number; voiceover: string; subtitle: string; reference_image_url: string | null }>) {
    const script = this.store.saveStoryboard(id, storyboard);
    if (!script) {
      throw new NotFoundException('剧本不存在');
    }
    return { id: script.id, updated_at: script.updated_at, total_duration: script.total_duration };
  }

  regenerateShot(id: string, shotIndex: number, newPrompt?: string) {
    const shot = this.store.regenerateShot(id, shotIndex, newPrompt);
    if (!shot) {
      throw new NotFoundException('分镜不存在');
    }
    return { event: 'done', shot_index: shotIndex, shot };
  }

  replaceFactor(id: string, dimension: string, newValue: string, scope: 'affected' | 'all' = 'affected') {
    const script = this.store.replaceFactor(id, dimension, newValue, scope);
    if (!script) {
      throw new NotFoundException('剧本不存在');
    }
    return { event: 'done', script_id: script.id, replaced_dimension: dimension, new_value: newValue, affected_shots: script.storyboard.map((shot) => shot.index), factor_history_id: script.factor_history.at(-1)?.id || null };
  }

  listFactors() {
    return this.store.listFactors();
  }
}

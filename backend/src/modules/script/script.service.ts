import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Script } from '../../database/entities/script.entity';
import { Project } from '../../database/entities/project.entity';
import { DirectorAgentService } from './director-agent.service';
import { GeneBankService } from '../gene-bank/gene-bank.service';
import {
  ResolvedCreativeFactors,
  CreativeFactorsSnake,
  resolveCreativeFactors,
  resolveFromCreativeFactors,
  getFactorGroups,
} from '../gene-bank/types/creative-factors.type';

export type ScriptShot = {
  index: number;
  description: string;
  camera_motion: string;
  duration: number;
  voiceover: string;
  subtitle: string;
  bgm: string;
  reference_image_url: string | null;
};

@Injectable()
export class ScriptService {
  private readonly logger = new Logger(ScriptService.name);

  constructor(
    private readonly director: DirectorAgentService,
    private readonly geneBank: GeneBankService,
    @InjectRepository(Script) private readonly scriptRepo: Repository<Script>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
  ) {}

  async generate(
    projectId: string,
    strategyType: string,
    referenceVideoId?: string,
    factorsOverride?: Partial<CreativeFactorsSnake>,
  ) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');

    const productInfo = (project.productInfo ?? {}) as Record<string, unknown>;

    // 创作因子优先级：前端因子面板显式传入(factorsOverride) > 参考视频(referenceVideoId)。
    // 面板的值由参考视频初始化，故用户在面板上的改动天然覆盖参考视频，符合所见即所得。
    // creativeFactors 恒有值（无来源时空解析），director 据此免去判空。
    let creativeFactors: ResolvedCreativeFactors;
    if (factorsOverride && Object.values(factorsOverride).some((v) => v)) {
      creativeFactors = resolveCreativeFactors(factorsOverride);
      this.logger.log('使用前端因子面板传入的创作因子');
    } else if (referenceVideoId) {
      const refVideo = await this.geneBank.getReferenceVideoById(referenceVideoId);
      creativeFactors = resolveFromCreativeFactors(refVideo.factors);
      this.logger.log(`使用参考视频 ${referenceVideoId} 的创作因子`);
    } else {
      creativeFactors = resolveCreativeFactors({});
      this.logger.log('未指定创作因子，使用空因子（不注入风格约束）');
    }

    const storyboard = await this.director.generateStoryboard(productInfo, strategyType, creativeFactors);

    const script = this.scriptRepo.create({
      projectId,
      strategyType,
      storyboard: storyboard as unknown as object,
      factorHistory: referenceVideoId ? [{ referenceVideoId, appliedAt: new Date().toISOString() }] : [],
      status: 'draft',
    });
    const saved = await this.scriptRepo.save(script);

    return {
      id: saved.id,
      project_id: saved.projectId,
      strategy_type: saved.strategyType,
      storyboard: storyboard.map((s: ScriptShot, i: number) => ({ ...s, index: i })),
      total_duration: storyboard.reduce((sum: number, s: ScriptShot) => sum + (s.duration || 3), 0),
    };
  }

  async getById(id: string) {
    const script = await this.scriptRepo.findOne({ where: { id } });
    if (!script) throw new NotFoundException('剧本不存在');
    return script;
  }

  async getLatestByProject(projectId: string, userId: string) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权访问该项目');

    const script = await this.scriptRepo.findOne({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
    if (!script) return null;

    const storyboard = (script.storyboard as ScriptShot[]) || [];
    return {
      id: script.id,
      project_id: script.projectId,
      total_duration: storyboard.reduce((sum, s) => sum + (s.duration || 3), 0),
      scenes: storyboard.map((shot: ScriptShot) => this.toScene(shot)),
    };
  }

  private toScene(shot: ScriptShot) {
    return {
      id: `scene-${shot.index}`,
      index: shot.index,
      duration: shot.duration || 3,
      thumb_url: `https://placehold.co/400x240/8B5CF6/fff?text=Scene+${shot.index + 1}`,
      description: shot.description,
      camera_motion: shot.camera_motion || 'static',
      bgm: shot.bgm || 'Modern Beat',
      voiceover: shot.voiceover || '',
      subtitle: shot.subtitle || '',
    };
  }

  async saveStoryboard(id: string, storyboard: ScriptShot[]) {
    const script = await this.scriptRepo.findOne({ where: { id } });
    if (!script) throw new NotFoundException('剧本不存在');
    await this.scriptRepo.update(id, { storyboard: storyboard as unknown as object });
    return { id, updated_at: new Date().toISOString(), total_duration: storyboard.reduce((sum, s) => sum + (s.duration || 3), 0) };
  }

  async regenerateShot(id: string, shotIndex: number, _newPrompt?: string) {
    const script = await this.scriptRepo.findOne({ where: { id } });
    if (!script) throw new NotFoundException('剧本不存在');
    const storyboard = (script.storyboard as ScriptShot[]) || [];
    const shot = storyboard.find((s) => s.index === shotIndex);
    if (!shot) throw new NotFoundException('分镜不存在');

    const project = await this.projectRepo.findOne({ where: { id: script.projectId } });
    const productInfo = (project?.productInfo || {}) as Record<string, unknown>;

    const regenerated = await this.director.regenerateShot(productInfo, storyboard, shotIndex);
    if (regenerated) {
      // 更新 storyboard 中对应分镜
      const updated = storyboard.map((s) => (s.index === shotIndex ? { ...regenerated, index: shotIndex } : s));
      await this.scriptRepo.update(id, { storyboard: updated as unknown as object });
      return { event: 'done', shot_index: shotIndex, shot: { ...regenerated, index: shotIndex } };
    }
    return { event: 'done', shot_index: shotIndex, shot };
  }

  async replaceFactor(id: string, dimension: string, newValue: string, scope: 'affected' | 'all' = 'affected') {
    const script = await this.scriptRepo.findOne({ where: { id } });
    if (!script) throw new NotFoundException('剧本不存在');
    return { event: 'done', script_id: id, replaced_dimension: dimension, new_value: newValue, affected_shots: ((script.storyboard as ScriptShot[]) || []).map((s) => s.index) };
  }

  async listFactors() {
    return getFactorGroups();
  }
}

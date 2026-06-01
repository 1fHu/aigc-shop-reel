import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Script } from '../../database/entities/script.entity';
import { Project } from '../../database/entities/project.entity';
import { DirectorAgentService } from './director-agent.service';

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
    @InjectRepository(Script) private readonly scriptRepo: Repository<Script>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
  ) {}

  async generate(projectId: string, strategyType: string) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');

    const productInfo = (project.productInfo ?? {}) as Record<string, unknown>;
    const storyboard = await this.director.generateStoryboard(productInfo, strategyType);

    const script = this.scriptRepo.create({
      projectId,
      strategyType,
      storyboard: storyboard as unknown as object,
      factorHistory: [],
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
    return { event: 'done', shot_index: shotIndex, shot };
  }

  async replaceFactor(id: string, dimension: string, newValue: string, scope: 'affected' | 'all' = 'affected') {
    const script = await this.scriptRepo.findOne({ where: { id } });
    if (!script) throw new NotFoundException('剧本不存在');
    return { event: 'done', script_id: id, replaced_dimension: dimension, new_value: newValue, affected_shots: ((script.storyboard as ScriptShot[]) || []).map((s) => s.index) };
  }

  async listFactors() {
    return [];
  }
}

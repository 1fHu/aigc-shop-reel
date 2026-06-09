import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Script } from '../../database/entities/script.entity';
import { Project } from '../../database/entities/project.entity';
import { Material } from '../../database/entities/material.entity';
import { DirectorAgentService } from './director-agent.service';
import { GeneBankService } from '../gene-bank/gene-bank.service';
import { VolcanoApiService } from '../volcano/volcano-api.service';
import {
  ResolvedCreativeFactors,
  CreativeFactorsSnake,
  resolveCreativeFactors,
  resolveFromCreativeFactors,
  getFactorGroups,
} from '../gene-bank/types/creative-factors.type';
import { promoteProjectStatus } from '../../common/project-status';

export type MaterialUseMode = 'none' | 'direct' | 'adapted';

export type ScriptShot = {
  index: number;
  description: string;
  camera_motion: string;
  duration: number;
  voiceover: string;
  subtitle: string;
  bgm: string;
  reference_image_url: string | null;
  // 素材召回绑定（向量召回，后端权威，前端只读）：
  // material_id 命中的素材；use_mode 由相似度阈值决定（none/direct/adapted）；
  // material_score 留痕便于调阈值；adapted_image_url 为模式B预生成图（第二批，主链路暂为 null）。
  material_id: string | null;
  material_use_mode: MaterialUseMode;
  material_score: number | null;
  adapted_image_url: string | null;
};

@Injectable()
export class ScriptService {
  private readonly logger = new Logger(ScriptService.name);

  // 召回相似度阈值：≥HIGH 直接用素材缩略图当首帧(direct)；[LOW,HIGH) 需按本幕改造(adapted)；
  // <LOW 不绑定(none)。放 env 便于上线后调参。
  private readonly tauHigh = parseFloat(process.env.MATERIAL_RECALL_TAU_HIGH || '0.82') || 0.82;
  private readonly tauLow = parseFloat(process.env.MATERIAL_RECALL_TAU_LOW || '0.55') || 0.55;

  constructor(
    private readonly director: DirectorAgentService,
    private readonly geneBank: GeneBankService,
    private readonly volcano: VolcanoApiService,
    @InjectRepository(Script) private readonly scriptRepo: Repository<Script>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Material) private readonly materialRepo: Repository<Material>,
  ) {}

  async generate(
    projectId: string,
    strategyType: string,
    referenceVideoId?: string,
    factorsOverride?: Partial<CreativeFactorsSnake>,
  ) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');

    // 闸门：素材必须全部解析完成（无 parsing）才允许进入剧本生成，保证召回拿到的是全量素材。
    // failed 不阻塞（不会再变 ready），由召回侧自然剔除。A=不强制至少 1 个素材。
    const parsingCount = await this.materialRepo.count({ where: { projectId, status: 'parsing' } });
    if (parsingCount > 0) {
      throw new ConflictException(`还有 ${parsingCount} 个素材正在解析，请等待解析完成后再生成剧本`);
    }

    const productInfo = (project.productInfo ?? {}) as Record<string, unknown>;

    // 创作因子优先级：前端因子面板显式传入(factorsOverride) > 参考视频(referenceVideoId)。
    // 面板的值由参考视频初始化，故用户在面板上的改动天然覆盖参考视频，符合所见即所得。
    // creativeFactors 恒有值（无来源时空解析），director 据此免去判空。
    let creativeFactors: ResolvedCreativeFactors;
    let factorSource: 'factor_panel' | 'reference' | 'none';
    if (factorsOverride && Object.values(factorsOverride).some((v) => v)) {
      creativeFactors = resolveCreativeFactors(factorsOverride);
      factorSource = 'factor_panel';
      this.logger.log('使用前端因子面板传入的创作因子');
    } else if (referenceVideoId) {
      const refVideo = await this.geneBank.getReferenceVideoById(referenceVideoId);
      creativeFactors = resolveFromCreativeFactors(refVideo.factors);
      factorSource = 'reference';
      this.logger.log(`使用参考视频 ${referenceVideoId} 的创作因子`);
    } else {
      creativeFactors = resolveCreativeFactors({});
      factorSource = 'none';
      this.logger.log('未指定创作因子，使用空因子（不注入风格约束）');
    }

    const storyboard = await this.director.generateStoryboard(productInfo, strategyType, creativeFactors);

    // 向量召回：为每一幕按描述从项目素材库召回最相关素材并绑定（修改 storyboard 内每个 shot）。
    await this.recallMaterialsForShots(projectId, storyboard);
    // 模式B：对 adapted 幕预生成适配首帧（D=预生成，剧本页即可预览）。
    await this.pregenerateAdaptedImages(storyboard);

    // 溯源：爆款仿写会同时带 referenceVideoId 与（来自该爆款的）面板因子，此时来源记为 factor_panel
    // 但 referenceVideoId 仍要落库，保证「仿写自哪条爆款 + 实际应用了哪些因子」完整可查。
    const script = this.scriptRepo.create({
      projectId,
      strategyType,
      storyboard: storyboard as unknown as object,
      factorHistory: [
        {
          source: factorSource,
          referenceVideoId: referenceVideoId ?? null,
          factors: creativeFactors,
          appliedAt: new Date().toISOString(),
        },
      ],
      status: 'draft',
    });
    const saved = await this.scriptRepo.save(script);

    await this.projectRepo.increment({ id: projectId }, 'scriptCount', 1);
    await this.projectRepo.update(projectId, {
      status: promoteProjectStatus(project.status, 'video_pending'),
    });

    return {
      id: saved.id,
      project_id: saved.projectId,
      strategy_type: saved.strategyType,
      storyboard: storyboard.map((s: ScriptShot, i: number) => ({ ...s, index: i })),
      total_duration: storyboard.reduce((sum: number, s: ScriptShot) => sum + (s.duration || 3), 0),
    };
  }

  /**
   * 向量召回：为每一幕从项目素材库召回最相关素材并就地绑定到 shot。
   * - 查询侧：分镜描述(+口播)做文本 embedding（与素材入库时的 doubao-embedding-vision 同空间）；
   * - 检索：pgvector 余弦算子 `<=>` 取 top-1；
   * - 用法：相似度阈值决定 none/direct/adapted（adapted 的预生成图属第二批，主链路留空）。
   * embedding 未配置 / 素材无向量时整体或逐幕安全跳过（保持 none），不阻断剧本生成。
   */
  private async recallMaterialsForShots(projectId: string, storyboard: ScriptShot[]): Promise<void> {
    if (storyboard.length === 0) return;

    const mats = await this.materialRepo.find({ where: { projectId, status: 'ready' } });
    const withVec = mats.filter((m) => m.embedding);
    if (withVec.length === 0) {
      this.logger.log('素材库无可召回素材（无 ready 素材或 embedding 为空），跳过召回');
      return;
    }
    const thumbById = new Map(mats.map((m) => [m.id, m.thumbnailUrl] as const));

    for (const shot of storyboard) {
      try {
        const queryText = [shot.description, shot.voiceover].filter(Boolean).join(' ').trim();
        if (!queryText) continue;
        const qvec = await this.volcano.generateEmbedding({ text: queryText });
        if (!qvec) {
          this.logger.warn('查询向量为空（embedding 未配置/失败），本次召回整体跳过');
          return;
        }
        const rows: Array<{ id: string; score: string | number }> = await this.materialRepo.query(
          `SELECT id, 1 - (embedding <=> $1::vector) AS score
             FROM materials
            WHERE project_id = $2 AND status = 'ready' AND embedding IS NOT NULL
            ORDER BY embedding <=> $1::vector
            LIMIT 1`,
          [qvec, projectId],
        );
        const top = rows[0];
        if (!top) continue;
        const score = typeof top.score === 'string' ? parseFloat(top.score) : top.score;
        const rounded = Number.isFinite(score) ? Number(score.toFixed(4)) : null;
        const mode: MaterialUseMode = score >= this.tauHigh ? 'direct' : score >= this.tauLow ? 'adapted' : 'none';

        shot.material_score = rounded;
        shot.adapted_image_url = null; // 模式B预生成属第二批
        if (mode === 'none') {
          shot.material_id = null;
          shot.material_use_mode = 'none';
          continue;
        }
        shot.material_id = top.id;
        shot.material_use_mode = mode;
        // 回填缩略图供前端预览（direct 直接用它当首帧；adapted 暂也回退到它）
        shot.reference_image_url = thumbById.get(top.id) ?? null;
        this.logger.log(`shot#${shot.index} 召回素材 ${top.id} score=${rounded} mode=${mode}`);
      } catch (err) {
        this.logger.warn(`shot#${shot.index} 素材召回失败：${(err as Error).message}`);
      }
    }
  }

  /**
   * 模式B 适配图预生成（D=预生成）：对 use_mode='adapted' 的幕，把原素材图 + 本幕剧本
   * 喂给 Seedream 图生图，产出该幕适配首帧写入 shot.adapted_image_url（并行出图）。
   * 出图失败 / 未配 Seedream → 该幕降级为 direct（仍用原素材缩略图当首帧），不阻断剧本生成。
   */
  private async pregenerateAdaptedImages(storyboard: ScriptShot[]): Promise<void> {
    const adaptedShots = storyboard.filter((s) => s.material_use_mode === 'adapted' && s.material_id);
    if (adaptedShots.length === 0) return;

    const ids = [...new Set(adaptedShots.map((s) => s.material_id as string))];
    const mats = await this.materialRepo.find({ where: { id: In(ids) } });
    const thumbById = new Map(mats.map((m) => [m.id, m.thumbnailUrl] as const));

    await Promise.all(
      adaptedShots.map(async (shot) => {
        const base = thumbById.get(shot.material_id as string);
        if (!base) {
          shot.material_use_mode = 'direct';
          return;
        }
        const prompt =
          `把参考图改造为下面这一幕竖屏 9:16 带货短视频的首帧画面，保持商品主体一致、写实、` +
          `光影自然、色彩饱满、无字幕无水印无 logo。画面：${shot.description}` +
          (shot.voiceover ? `；配音语境：${shot.voiceover}` : '');
        const url = await this.volcano.adaptShotImage({ baseImageUrl: base, prompt });
        if (url) {
          shot.adapted_image_url = url;
        } else {
          // 出图失败/未配 → 降级 direct，用原素材图当首帧
          shot.material_use_mode = 'direct';
          this.logger.warn(`shot#${shot.index} 适配图生成失败，降级为 direct`);
        }
      }),
    );
  }

  /**
   * 剧本生成就绪检查：素材是否全部解析完成。前端据此置灰「生成剧本」按钮。
   * ready=true 表示无 parsing 中素材，可进入生成（A=不强制至少 1 个素材）。
   */
  async getReadiness(projectId: string, userId: string) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权访问该项目');
    const [total, parsing, failed] = await Promise.all([
      this.materialRepo.count({ where: { projectId } }),
      this.materialRepo.count({ where: { projectId, status: 'parsing' } }),
      this.materialRepo.count({ where: { projectId, status: 'failed' } }),
    ]);
    return { ready: parsing === 0, total, parsing, failed };
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
    // 召回到素材时，缩略图优先用素材图（direct）或预生成适配图（adapted），供前端预览本幕首帧
    const thumb = shot.adapted_image_url || shot.reference_image_url
      || `https://placehold.co/400x240/8B5CF6/fff?text=Scene+${shot.index + 1}`;
    return {
      id: `scene-${shot.index}`,
      index: shot.index,
      duration: shot.duration || 3,
      thumb_url: thumb,
      description: shot.description,
      camera_motion: shot.camera_motion || 'static',
      bgm: shot.bgm || 'Modern Beat',
      voiceover: shot.voiceover || '',
      subtitle: shot.subtitle || '',
      // 素材绑定（前端只读展示，C=不允许手动改）
      material_id: shot.material_id ?? null,
      material_use_mode: shot.material_use_mode ?? 'none',
      material_score: shot.material_score ?? null,
    };
  }

  // 前端编辑提交的分镜：可不含素材绑定字段（C=不允许改，服务端按 index 回填）
  async saveStoryboard(id: string, storyboard: Array<Omit<ScriptShot, 'material_id' | 'material_use_mode' | 'material_score' | 'adapted_image_url'>>) {
    const script = await this.scriptRepo.findOne({ where: { id } });
    if (!script) throw new NotFoundException('剧本不存在');
    // C=不允许手动改素材绑定：素材召回字段以服务端落库为权威，忽略前端提交里的篡改，
    // 按 index 从原 storyboard 回填 material_*/adapted_image_url/reference_image_url。
    const prev = (script.storyboard as ScriptShot[]) || [];
    const prevByIndex = new Map(prev.map((s) => [s.index, s] as const));
    const merged = storyboard.map((s) => {
      const old = prevByIndex.get(s.index);
      return {
        ...s,
        material_id: old?.material_id ?? null,
        material_use_mode: old?.material_use_mode ?? 'none',
        material_score: old?.material_score ?? null,
        adapted_image_url: old?.adapted_image_url ?? null,
        reference_image_url: old?.reference_image_url ?? s.reference_image_url ?? null,
      };
    });
    await this.scriptRepo.update(id, { storyboard: merged as unknown as object });
    return { id, updated_at: new Date().toISOString(), total_duration: merged.reduce((sum, s) => sum + (s.duration || 3), 0) };
  }

  async regenerateShot(
    id: string,
    shotIndex: number,
    factorsOverride?: Partial<CreativeFactorsSnake>,
    _newPrompt?: string,
  ) {
    const script = await this.scriptRepo.findOne({ where: { id } });
    if (!script) throw new NotFoundException('剧本不存在');
    const storyboard = (script.storyboard as ScriptShot[]) || [];
    const shot = storyboard.find((s) => s.index === shotIndex);
    if (!shot) throw new NotFoundException('分镜不存在');

    const project = await this.projectRepo.findOne({ where: { id: script.projectId } });
    const productInfo = (project?.productInfo || {}) as Record<string, unknown>;

    // 重生分镜也带上创作因子，保持与全片风格统一（无则空解析，不注入约束）
    const creativeFactors =
      factorsOverride && Object.values(factorsOverride).some((v) => v)
        ? resolveCreativeFactors(factorsOverride)
        : resolveCreativeFactors({});

    const regenerated = await this.director.regenerateShot(productInfo, storyboard, shotIndex, creativeFactors);
    if (regenerated) {
      // 画面变了，重新为这一幕做素材召回 + 适配图预生成（仅这一幕，其余分镜绑定不动）
      const newShot: ScriptShot = { ...regenerated, index: shotIndex };
      await this.recallMaterialsForShots(script.projectId, [newShot]);
      await this.pregenerateAdaptedImages([newShot]);
      const updated = storyboard.map((s) => (s.index === shotIndex ? newShot : s));
      await this.scriptRepo.update(id, { storyboard: updated as unknown as object });
      return { event: 'done', shot_index: shotIndex, shot: newShot };
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

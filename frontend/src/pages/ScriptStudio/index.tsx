import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input, Select, Skeleton, Tag, App, Popconfirm } from 'antd';
import {
  VideoCameraOutlined,
  EditOutlined,
  ControlOutlined,
  UndoOutlined,
  RedoOutlined,
  SaveOutlined,
  PlusOutlined,
  ReloadOutlined,
  CheckCircleFilled,
  PlayCircleFilled,
  MobileOutlined,
  RocketOutlined,
  HistoryOutlined,
  HolderOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { scriptService } from '@/services/scriptService';
import type {
  FactorGroup,
  FactorKey,
  Script,
  ScriptMode,
  Scene,
} from '@/types';
import { SCRIPT_MODE_LABELS } from '@/types';
import styles from './ScriptStudio.module.css';

const MODE_KEYS: ScriptMode[] = ['reference', 'template', 'auto'];

function formatTime(iso: string): string {
  return new Date(iso).toTimeString().slice(0, 5);
}

/** 创建一个空白分镜（"+ 添加分镜" 用） */
function makeNewScene(index: number): Scene {
  const id = `scene-${Date.now()}`;
  return {
    id,
    index,
    duration: 3.0,
    thumb_url: `https://picsum.photos/seed/${id}/400/240`,
    description: '新分镜：请输入画面描述...',
    camera_motion: '固定镜（Static）',
    bgm: 'Modern Beat',
    voiceover: '',
    subtitle: '',
  };
}

/**
 * 单条分镜卡片 —— useSortable 让它能被拖拽
 * 注意：drag handle 只是 grip 图标，不是整张卡，避免点击选中和拖拽冲突
 */
interface SceneCardProps {
  scene: Scene;
  index: number;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}
function SortableSceneCard({ scene, index, active, onSelect, onDelete }: SceneCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: scene.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.sceneCard} ${active ? styles.sceneCardActive : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      <div className={styles.sceneCardHead}>
        <span className={styles.sceneCardLabel}>#0{index + 1} SCENE</span>
        <div className={styles.sceneCardActions}>
          <button
            type="button"
            className={styles.sceneCardIcon}
            aria-label="拖拽排序"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <HolderOutlined />
          </button>
          <Popconfirm
            title="确定删除此分镜？"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={(e) => { e?.stopPropagation(); onDelete(); }}
            onCancel={(e) => e?.stopPropagation()}
          >
            <button
              type="button"
              className={`${styles.sceneCardIcon} ${styles.sceneCardIconDanger}`}
              aria-label="删除分镜"
              onClick={(e) => e.stopPropagation()}
            >
              <DeleteOutlined />
            </button>
          </Popconfirm>
          <span className={styles.sceneCardDuration}>{scene.duration.toFixed(1)}s</span>
        </div>
      </div>
      <img src={scene.thumb_url} alt={`Scene ${index + 1}`} className={styles.sceneCardThumb} />
      <p className={styles.sceneCardDesc}>{scene.description}</p>
    </div>
  );
}

export default function ScriptStudio() {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const { message } = App.useApp();

  // 顶层 /script-studio 无 projectId 时也用 demo 剧本
  const scriptId = 'demo-script-001';

  const [script, setScript] = useState<Script | null>(null);
  const [factorLib, setFactorLib] = useState<FactorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mode, setMode] = useState<ScriptMode>('reference');
  /** 因子替换中（mock 模拟 LLM 重生 ~1.5s）—— 用于禁用 chips + 显示模糊蒙层 + pill */
  const [factorChanging, setFactorChanging] = useState(false);
  /** 受当前重生影响的分镜 id 集合（让"模糊态"只作用于这些分镜） */
  const [affectedSceneIds, setAffectedSceneIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    Promise.all([scriptService.get(scriptId), scriptService.getFactors()])
      .then(([scr, factors]) => {
        if (cancelled) return;
        setScript(scr);
        setMode(scr.mode);
        setFactorLib(factors);
      })
      .catch(() => { /* 拦截器已 toast */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [scriptId]);

  const selectedScene = script?.scenes[selectedIdx];

  const updateScene = (patch: Partial<Scene>) => {
    if (!script || !selectedScene) return;
    const next = { ...script };
    next.scenes = next.scenes.map((s, i) => (i === selectedIdx ? { ...s, ...patch } : s));
    setScript(next);
  };

  const totalDuration = useMemo(() => {
    if (!script) return 0;
    return script.scenes.reduce((acc, s) => acc + s.duration, 0);
  }, [script]);

  const handleSave = async () => {
    if (!script) return;
    try {
      await scriptService.saveStoryboard(script.id, { scenes: script.scenes });
      message.success('已保存');
    } catch { /* toast by interceptor */ }
  };

  /**
   * 因子替换核心交互
   *
   * 流程：
   *   1) 立即更新 factors[key] = value（让 chip 视觉立刻变）
   *   2) 标记 factorChanging + 受影响分镜，触发模糊蒙层 + pill
   *   3) 调 POST /scripts/:id/replace-factor（mock 延迟 1.5s）
   *   4) 用返回的 updated_scenes 合并回 script.scenes
   *   5) 把 history_entry 添加到 script.history 顶部
   *   6) 清除中间态
   */
  const handleReplaceFactor = async (key: FactorKey, value: string) => {
    if (!script || factorChanging) return;
    if (script.factors[key] === value) return; // 已是当前值，无需操作

    // 1) 乐观更新 chip 选中态
    const prevFactors = script.factors;
    setScript({ ...script, factors: { ...prevFactors, [key]: value } });

    // 2) 预估受影响分镜（与 mock 中 FACTOR_IMPACT 规则一致，前端用于即时蒙层）
    const impactMap: Record<FactorKey, (scenes: Scene[]) => string[]> = {
      visual_style: (sc) => sc.slice(0, 2).map((s) => s.id),
      opener:       (sc) => sc.slice(0, 1).map((s) => s.id),
      narration:    (sc) => sc.map((s) => s.id),
      pacing:       (sc) => sc.map((s) => s.id),
      cta:          (sc) => sc.slice(-1).map((s) => s.id),
    };
    setAffectedSceneIds(new Set(impactMap[key](script.scenes)));
    setFactorChanging(true);

    try {
      const result = await scriptService.replaceFactor(script.id, { factor: key, value });

      // 4) 合并 updated_scenes
      setScript((cur) => {
        if (!cur) return cur;
        const idMap = new Map(result.updated_scenes.map((s) => [s.id, s]));
        return {
          ...cur,
          scenes: cur.scenes.map((s) => idMap.get(s.id) || s),
          history: [result.history_entry, ...cur.history],
          factors: { ...cur.factors, [key]: value },
        };
      });
    } catch {
      // 失败回滚 chip 选中态
      setScript((cur) => cur ? { ...cur, factors: prevFactors } : cur);
    } finally {
      setFactorChanging(false);
      setAffectedSceneIds(new Set());
    }
  };

  const handleGenerateVideo = () => {
    const target = projectId ? `/projects/${projectId}/video` : '/video-creation';
    navigate(target);
  };

  // ============ DnD sensors ============
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  /** 持久化当前 scenes 到后端（拖拽 / 增删后调用） */
  const persistScenes = async (next: Scene[]) => {
    if (!script) return;
    try {
      await scriptService.saveStoryboard(script.id, { scenes: next });
    } catch { /* 拦截器已 toast */ }
  };

  /** 拖拽结束 → 重新排序 */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!script || !over || active.id === over.id) return;
    const oldIdx = script.scenes.findIndex((s) => s.id === active.id);
    const newIdx = script.scenes.findIndex((s) => s.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(script.scenes, oldIdx, newIdx).map((s, i) => ({ ...s, index: i }));
    setScript({ ...script, scenes: next });
    // 调整选中索引：被拖的分镜跟着移动
    if (selectedIdx === oldIdx) setSelectedIdx(newIdx);
    else if (oldIdx < selectedIdx && newIdx >= selectedIdx) setSelectedIdx(selectedIdx - 1);
    else if (oldIdx > selectedIdx && newIdx <= selectedIdx) setSelectedIdx(selectedIdx + 1);
    persistScenes(next);
  };

  /** 在末尾添加新分镜 */
  const handleAddScene = () => {
    if (!script) return;
    const newScene = makeNewScene(script.scenes.length);
    const next = [...script.scenes, newScene];
    setScript({ ...script, scenes: next });
    setSelectedIdx(next.length - 1); // 自动选中新分镜
    message.success('已添加新分镜');
    persistScenes(next);
  };

  /** 删除分镜 */
  const handleDeleteScene = (sceneId: string) => {
    if (!script) return;
    if (script.scenes.length <= 1) {
      message.warning('至少保留一个分镜');
      return;
    }
    const removedIdx = script.scenes.findIndex((s) => s.id === sceneId);
    const next = script.scenes
      .filter((s) => s.id !== sceneId)
      .map((s, i) => ({ ...s, index: i }));
    setScript({ ...script, scenes: next });
    // 调整选中索引
    if (selectedIdx === removedIdx) {
      setSelectedIdx(Math.max(0, removedIdx - 1));
    } else if (removedIdx < selectedIdx) {
      setSelectedIdx(selectedIdx - 1);
    }
    message.success('已删除分镜');
    persistScenes(next);
  };

  if (loading || !script) {
    return (
      <div className={styles.skelShell}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      {/* ============ Top toolbar ============ */}
      <div className={styles.toolbar}>
        <div className={styles.modeSegment}>
          {MODE_KEYS.map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.modeBtn} ${mode === m ? styles.modeBtnActive : ''}`}
              onClick={() => setMode(m)}
            >
              {SCRIPT_MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className={styles.toolbarRight}>
          <button type="button" className={styles.toolIconBtn} aria-label="撤销"><UndoOutlined /></button>
          <button type="button" className={styles.toolIconBtn} aria-label="重做"><RedoOutlined /></button>
          <button type="button" className={styles.versionBtn}>{script.version} ▾</button>
          <button type="button" className={styles.saveBtn} onClick={handleSave}>
            <SaveOutlined /> 保存
          </button>
        </div>
      </div>

      {/* ============ 3-column workspace ============ */}
      <div className={styles.workspace}>
        {/* ----- Left: timeline ----- */}
        <aside className={styles.timeline}>
          <div className={styles.colHead}>
            <div className={styles.colTitle}>
              <VideoCameraOutlined /> 分镜时间轴
            </div>
            <button
              type="button"
              className={styles.toolIconBtn}
              aria-label="添加分镜"
              onClick={handleAddScene}
            >
              <PlusOutlined style={{ fontSize: 14 }} />
            </button>
          </div>
          <div className={styles.timelineList}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={script.scenes.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {script.scenes.map((s, i) => (
                  <SortableSceneCard
                    key={s.id}
                    scene={s}
                    index={i}
                    active={selectedIdx === i}
                    onSelect={() => setSelectedIdx(i)}
                    onDelete={() => handleDeleteScene(s.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <button type="button" className={styles.addSceneBtn} onClick={handleAddScene}>
              <PlusOutlined /> 添加分镜
            </button>
          </div>
        </aside>

        {/* ----- Middle: editor ----- */}
        <main className={styles.editor}>
          <div className={styles.editorInner}>
            <div className={styles.editorHead}>
              <div className={styles.editorHeadLeft}>
                <span className={styles.colTitle}>
                  <EditOutlined /> 分镜编辑器
                </span>
                <Tag color="processing" style={{ borderRadius: 999, fontFamily: 'JetBrains Mono, monospace' }}>
                  #0{selectedIdx + 1}
                </Tag>
                {factorChanging && selectedScene && affectedSceneIds.has(selectedScene.id) && (
                  <Tag color="warning" style={{ borderRadius: 999 }}>
                    <PlayCircleFilled /> 智能重生中
                  </Tag>
                )}
              </div>
              <button type="button" className={styles.regenBtn}>
                <ReloadOutlined /> 重生分镜
              </button>
            </div>

            {selectedScene && (
              <>
                {/* Preview —— 仅当本分镜被本次重生影响时才模糊 */}
                {(() => {
                  const sceneAffected = factorChanging && affectedSceneIds.has(selectedScene.id);
                  return (
                    <div className={`${styles.previewWrap} ${sceneAffected ? styles.regenerating : ''}`}>
                      <img src={selectedScene.thumb_url} alt={`Scene ${selectedIdx + 1}`} />
                      {sceneAffected && (
                        <div className={styles.regenOverlay}>
                          <div className={styles.regenPill}>
                            <span className={styles.regenDot} />
                            正在按新因子重新生成画面...
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Fields */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Prompt · 画面描述</label>
                  <Input.TextArea
                    rows={3}
                    value={selectedScene.description}
                    onChange={(e) => updateScene({ description: e.target.value })}
                  />
                </div>

                <div className={styles.fieldRow}>
                  <div>
                    <label className={styles.fieldLabel}>镜头运动</label>
                    <Select
                      style={{ width: '100%' }}
                      value={selectedScene.camera_motion}
                      onChange={(v) => updateScene({ camera_motion: v })}
                      options={[
                        '缓推镜（Slow Zoom-in）',
                        '固定镜（Static）',
                        '跟拍（Tracking）',
                        '环绕镜（Orbit）',
                      ].map((v) => ({ value: v, label: v }))}
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>BGM</label>
                    <Select
                      style={{ width: '100%' }}
                      value={selectedScene.bgm}
                      onChange={(v) => updateScene({ bgm: v })}
                      options={['Modern Beat', 'Cinematic', 'Energy Pop', 'Lo-fi Chill'].map((v) => ({
                        value: v,
                        label: v,
                      }))}
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>配音文案</label>
                  <Input.TextArea
                    rows={2}
                    value={selectedScene.voiceover}
                    onChange={(e) => updateScene({ voiceover: e.target.value })}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>字幕</label>
                  <Input
                    value={selectedScene.subtitle}
                    onChange={(e) => updateScene({ subtitle: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
        </main>

        {/* ----- Right: factors ----- */}
        <aside className={styles.factors}>
          <div className={styles.colHead}>
            <div className={styles.colTitle}>
              <ControlOutlined /> 创作因子
            </div>
            {factorChanging ? (
              <Tag color="warning" style={{ margin: 0, borderRadius: 999 }}>
                <PlayCircleFilled /> 应用中
              </Tag>
            ) : (
              <Tag color="success" style={{ margin: 0, borderRadius: 999 }}>
                <CheckCircleFilled /> 已应用
              </Tag>
            )}
          </div>
          <div className={styles.factorsBody}>
            {factorLib.map((g) => (
              <div key={g.key} className={styles.factorGroupBlock}>
                <div className={styles.factorGroupLabel}>{g.label}</div>
                <div className={styles.factorChips}>
                  {g.options.map((opt) => {
                    const isActive = script.factors[g.key as FactorKey] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
                        onClick={() => handleReplaceFactor(g.key as FactorKey, opt)}
                        disabled={factorChanging}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className={styles.factorDivider} />

            <div>
              <div className={styles.factorGroupLabel}>操作历史</div>
              {script.history.map((h) => (
                <div key={h.id} className={styles.historyEntry}>
                  <span className={styles.historyTime}>{formatTime(h.timestamp)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.historyMsg}>{h.message}</div>
                    <div className={styles.historyAffected}>
                      <HistoryOutlined style={{ fontSize: 10 }} /> 影响：{h.affected_scene_ids.length} 个分镜
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ============ Bottom action bar ============ */}
      <div className={styles.bottombar}>
        <div className={styles.bottombarLeft}>
          <div className={styles.bottomStat}>
            <span className={styles.bottomStatLabel}>总估算时长</span>
            <span className={styles.bottomStatValue}>{totalDuration.toFixed(1)}s</span>
          </div>
          <div className={styles.bottomSep} />
          <div className={styles.bottomStat}>
            <span className={styles.bottomStatLabel}>当前分镜时长</span>
            <span className={styles.bottomStatValue}>{selectedScene?.duration.toFixed(1) || 0}s</span>
          </div>
        </div>

        <div className={styles.bottombarRight}>
          <button type="button" className={styles.sendBtn}>
            <MobileOutlined /> 发送至手机
          </button>
          <button type="button" className={styles.genBtn} onClick={handleGenerateVideo}>
            <RocketOutlined /> 生成视频
          </button>
        </div>
      </div>
    </div>
  );
}

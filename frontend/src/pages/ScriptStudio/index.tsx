import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input, Select, Skeleton, Tag, App } from 'antd';
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
} from '@ant-design/icons';

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
  // Step 2 会用到（因子替换中态）
  // const [factorChanging, setFactorChanging] = useState(false);
  const factorChanging = false;

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

  const handleGenerateVideo = () => {
    const target = projectId ? `/projects/${projectId}/video` : '/video-creation';
    navigate(target);
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
            <button type="button" className={styles.toolIconBtn} aria-label="添加分镜">
              <PlusOutlined style={{ fontSize: 14 }} />
            </button>
          </div>
          <div className={styles.timelineList}>
            {script.scenes.map((s, i) => (
              <div
                key={s.id}
                className={`${styles.sceneCard} ${selectedIdx === i ? styles.sceneCardActive : ''}`}
                onClick={() => setSelectedIdx(i)}
                role="button"
                tabIndex={0}
              >
                <div className={styles.sceneCardHead}>
                  <span className={styles.sceneCardLabel}>#0{i + 1} SCENE</span>
                  <span className={styles.sceneCardDuration}>{s.duration.toFixed(1)}s</span>
                </div>
                <img src={s.thumb_url} alt={`Scene ${i + 1}`} className={styles.sceneCardThumb} />
                <p className={styles.sceneCardDesc}>{s.description}</p>
              </div>
            ))}
            <button type="button" className={styles.addSceneBtn}>
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
                {factorChanging && (
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
                {/* Preview */}
                <div className={`${styles.previewWrap} ${factorChanging ? styles.regenerating : ''}`}>
                  <img src={selectedScene.thumb_url} alt={`Scene ${selectedIdx + 1}`} />
                  {factorChanging && (
                    <div className={styles.regenOverlay}>
                      <div className={styles.regenPill}>
                        <span className={styles.regenDot} />
                        正在按新因子重新生成画面...
                      </div>
                    </div>
                  )}
                </div>

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
            <Tag color="success" style={{ margin: 0, borderRadius: 999 }}>
              <CheckCircleFilled /> 已应用
            </Tag>
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
                        // Step 2 会启用此 onClick
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

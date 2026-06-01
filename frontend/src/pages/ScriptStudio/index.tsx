import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { App, Skeleton } from 'antd';
import { RocketOutlined, SaveOutlined, ThunderboltFilled } from '@ant-design/icons';
import { scriptService } from '@/services/scriptService';
import type { Scene, FactorGroup, FactorState, FactorKey, ScriptHistoryEntry } from '@/types';
import ShotTimeline from './ShotTimeline';
import ShotEditor from './ShotEditor';
import FactorPanel from './FactorPanel';
import styles from './ScriptStudio.module.css';

const DEFAULT_SCENE: Omit<Scene, 'id' | 'index'> = {
  duration: 3,
  thumb_url: '',
  description: '',
  camera_motion: 'static',
  bgm: 'Modern Beat',
  voiceover: '',
  subtitle: '',
};

export default function ScriptStudio() {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const { message } = App.useApp();

  // ---- state ----
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [scriptId, setScriptId] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(!!projectId);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [factorState, setFactorState] = useState<FactorState>({
    visual_style: '电影级精致',
    opener: '利益点切入',
    narration: '冷静知性',
    pacing: '中节奏',
    cta: '直接报价',
  });
  const [factors, setFactors] = useState<FactorGroup[]>([]);
  const [history, setHistory] = useState<ScriptHistoryEntry[]>([]);
  const [applyingFactor, setApplyingFactor] = useState(false);

  // ---- load existing script + factors on mount ----
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    Promise.all([
      scriptService.getLatestByProject(projectId),
      scriptService.getFactors().catch(() => [] as FactorGroup[]),
    ]).then(([existing, factorList]) => {
      if (cancelled) return;
      if (existing && existing.scenes.length > 0) {
        setScenes(existing.scenes);
        setScriptId(existing.id);
        setSelectedIndex(0);
      }
      if (factorList.length > 0) {
        setFactors(factorList);
        const initState = { ...factorState };
        factorList.forEach((g) => { if (!initState[g.key]) initState[g.key] = g.options[0]; });
        setFactorState(initState);
      }
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ---- handlers ----
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    let cleared = false;
    try {
      const pid = projectId || '';
      for await (const event of scriptService.generate({ project_id: pid, strategy_type: 'pain_point' })) {
        if (event.type === 'scene') {
          if (!cleared) { setScenes([]); cleared = true; }
          setScenes((prev) => [...prev, event.scene]);
        } else if (event.type === 'done') {
          setScriptId(event.script_id);
          setGenerating(false);
        }
      }
    } catch {
      message.error('剧本生成失败');
      setGenerating(false);
    }
  }, [projectId, message]);

  const handleSave = useCallback(async () => {
    if (!scriptId) return;
    try {
      await scriptService.saveStoryboard(scriptId, { scenes });
      message.success('分镜已保存');
    } catch {
      message.error('保存失败');
    }
  }, [scriptId, scenes, message]);

  const handleFieldChange = useCallback((index: number, field: string, value: string | number) => {
    setScenes((prev) => prev.map((s) => (s.index === index ? { ...s, [field]: value } : s)));
  }, []);

  const handleAddShot = useCallback(() => {
    setScenes((prev) => {
      const newIndex = prev.length;
      const newScene: Scene = {
        id: `scene-${newIndex}-${Date.now()}`,
        index: newIndex,
        ...DEFAULT_SCENE,
        thumb_url: `https://placehold.co/400x240/8B5CF6/fff?text=Scene+${newIndex + 1}`,
      };
      return [...prev, newScene];
    });
    setSelectedIndex(() => scenes.length);
  }, [scenes.length]);

  const handleDeleteShot = useCallback((index: number) => {
    setScenes((prev) => {
      const filtered = prev.filter((s) => s.index !== index);
      return filtered.map((s, i) => ({ ...s, index: i }));
    });
    setSelectedIndex((prev) => {
      if (prev === index) return Math.max(0, index - 1);
      if (prev > index) return prev - 1;
      return prev;
    });
  }, []);

  const handleRegenerateShot = useCallback(async (index: number) => {
    if (!scriptId) return;
    setRegenerating(true);
    try {
      const token = localStorage.getItem('vidcraft_access_token');
      const resp = await fetch(`/api/scripts/${scriptId}/regenerate-shot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shot_index: index }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const result = data.data || data;
      if (result?.shot) {
        setScenes((prev) => prev.map((s) => (s.index === index ? { ...s, ...result.shot, index } : s)));
      }
      message.success('分镜已重生');
    } catch {
      message.error('重生失败');
    } finally {
      setRegenerating(false);
    }
  }, [scriptId, message]);

  const handleFactorChange = useCallback(async (key: FactorKey, value: string) => {
    const previousValue = factorState[key];
    setFactorState((prev) => ({ ...prev, [key]: value }));
    if (!scriptId) return;
    setApplyingFactor(true);
    try {
      const token = localStorage.getItem('vidcraft_access_token');
      const resp = await fetch(`/api/scripts/${scriptId}/replace-factor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dimension: key, new_value: value }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const result = data.data || data;
      if (result?.affected_shots) {
        const now = new Date().toISOString();
        setHistory((prev) => [{
          id: `${Date.now()}`,
          timestamp: now,
          message: `替换 "${factors.find((f) => f.key === key)?.label || key}" → ${value}`,
          affected_scene_ids: result.affected_shots.map((i: number) => `#${String(i + 1).padStart(2, '0')}`),
        }, ...prev]);
      }
    } catch {
      setFactorState((prev) => ({ ...prev, [key]: previousValue }));
      message.error('因子替换失败');
    } finally {
      setApplyingFactor(false);
    }
  }, [scriptId, factors, factorState, message]);

  const handleGenerateVideo = useCallback(() => {
    const target = projectId
      ? `/projects/${projectId}/video?scriptId=${scriptId}`
      : `/video-creation?scriptId=${scriptId}`;
    navigate(target);
  }, [projectId, scriptId, navigate]);

  const totalDuration = scenes.reduce((sum, s) => sum + (s.duration || 3), 0);

  // ---- loading state ----
  if (loading) {
    return (
      <div className={styles.shell}>
        <div className={styles.skelShell}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      </div>
    );
  }

  // ---- empty state ----
  if (!scenes.length && !generating) {
    return (
      <div className={styles.shell}>
        <div className={styles.page}>
          <div className={styles.emptyState}>
            <h2>分镜编辑</h2>
            <p>基于商品信息，AI 自动生成带货视频分镜剧本，也可手动逐镜编辑</p>
            <button
              className={styles.genBtn}
              onClick={handleGenerate}
              disabled={generating}
            >
              <ThunderboltFilled /> AI 生成剧本
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- editor ----
  const selectedScene = scenes.find((s) => s.index === selectedIndex);

  return (
    <div className={styles.shell}>
      {/* ====== Toolbar ====== */}
      <div className={styles.toolbar}>
        <div className={styles.modeSegment}>
          <button className={styles.modeBtn} disabled title="即将上线">爆款仿写</button>
          <button className={styles.modeBtn} disabled title="即将上线">灵感模板</button>
          <button className={`${styles.modeBtn} ${styles.modeBtnActive}`} onClick={handleGenerate}>
            <ThunderboltFilled style={{ fontSize: 11, marginRight: 2 }} /> AI 生成剧本
          </button>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.saveBtn} onClick={handleSave} disabled={!scriptId || generating}>
            <SaveOutlined /> 保存
          </button>
        </div>
      </div>

      {/* ====== 3-column workspace ====== */}
      <div className={styles.workspace}>
        <ShotTimeline
          scenes={scenes}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          onAdd={handleAddShot}
          onDelete={handleDeleteShot}
        />
        <ShotEditor
          scene={selectedScene}
          regenerating={regenerating}
          onChange={handleFieldChange}
          onRegenerate={handleRegenerateShot}
        />
        <FactorPanel
          factors={factors}
          factorState={factorState}
          history={history}
          applying={applyingFactor}
          onFactorChange={handleFactorChange}
        />
      </div>

      {/* ====== Bottom bar ====== */}
      <div className={styles.bottombar}>
        <div className={styles.bottombarLeft}>
          <div className={styles.bottomStat}>
            <span className={styles.bottomStatLabel}>总时长</span>
            <span className={styles.bottomStatValue}>{totalDuration}s</span>
          </div>
          <span className={styles.bottomSep} />
          <div className={styles.bottomStat}>
            <span className={styles.bottomStatLabel}>分镜数</span>
            <span className={styles.bottomStatValue}>{scenes.length}</span>
          </div>
        </div>
        <div className={styles.bottombarRight}>
          <button
            className={styles.genBtn}
            onClick={handleGenerateVideo}
            disabled={!scriptId || scenes.length === 0 || generating}
          >
            <RocketOutlined /> 生成视频
          </button>
        </div>
      </div>
    </div>
  );
}

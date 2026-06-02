import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { App, Skeleton, Modal, Checkbox } from 'antd';
import { RocketOutlined, SaveOutlined, ThunderboltFilled, PlaySquareOutlined, ReloadOutlined } from '@ant-design/icons';
import { scriptService } from '@/services/scriptService';
import { videoService } from '@/services/videoService';
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
  const { message, modal } = App.useApp();

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
  const [voiceId, setVoiceId] = useState(() => localStorage.getItem('vidcraft_voice_id') || 'zh_female_vv_uranus_bigtts');
  const [subtitleEnabled, setSubtitleEnabled] = useState(() => localStorage.getItem('vidcraft_subtitle') !== 'false');
  const [subtitleFontSize, setSubtitleFontSize] = useState(() => Number(localStorage.getItem('vidcraft_sub_fontsize')) || 40);
  const [subtitleOutline, setSubtitleOutline] = useState(() => Number(localStorage.getItem('vidcraft_sub_outline')) || 2.5);
  const [customRequirement, setCustomRequirement] = useState(() => localStorage.getItem('vidcraft_custom_req') || '');
  const [subtitleColor, setSubtitleColor] = useState(() => localStorage.getItem('vidcraft_sub_color') || '#FFFFFF');
  const [subtitleFontFamily, setSubtitleFontFamily] = useState(() => localStorage.getItem('vidcraft_sub_font') || 'Microsoft YaHei');

  const handleVoiceChange = (v: string) => { setVoiceId(v); localStorage.setItem('vidcraft_voice_id', v); };
  const handleSubtitleChange = (v: boolean) => { setSubtitleEnabled(v); localStorage.setItem('vidcraft_subtitle', String(v)); };
  const handleSubFontSize = (v: number) => { setSubtitleFontSize(v); localStorage.setItem('vidcraft_sub_fontsize', String(v)); };
  const handleSubOutline = (v: number) => { setSubtitleOutline(v); localStorage.setItem('vidcraft_sub_outline', String(v)); };
  const handleCustomReq = (v: string) => { setCustomRequirement(v); localStorage.setItem('vidcraft_custom_req', v); };
  const handleSubColor = (v: string) => { setSubtitleColor(v); localStorage.setItem('vidcraft_sub_color', v); };
  const handleSubFontFamily = (v: string) => { setSubtitleFontFamily(v); localStorage.setItem('vidcraft_sub_font', v); };

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

  // ---- video / shot generation ----
  const [regeneratingShots, setRegeneratingShots] = useState(false);
  const [shotSelectOpen, setShotSelectOpen] = useState(false);
  const [selectedShotIndices, setSelectedShotIndices] = useState<number[]>([]);

  const handleGenerateVideo = useCallback(() => {
    if (!scriptId) { message.warning('请先生成或保存剧本'); return; }
    const target = projectId
      ? `/projects/${projectId}/video?scriptId=${scriptId}`
      : `/video-creation?scriptId=${scriptId}`;
    modal.confirm({
      title: '重新生成视频',
      content: '将清除该项目的已有视频并重新生成所有分镜，是否继续？',
      okText: '是，重新生成',
      cancelText: '否',
      onOk: () => navigate(target),
    });
  }, [projectId, scriptId, navigate, message]);

  const handleRegenerateShots = useCallback(async () => {
    if (!projectId) { message.warning('项目ID缺失'); return; }
    try {
      const latest = await videoService.getLatestByProject(projectId);
      if (!latest || latest.status !== 'completed') {
        message.warning('请先生成完整视频后再重新生成分镜');
        return;
      }
      setSelectedShotIndices(scenes.map((s) => s.index));
      setShotSelectOpen(true);
    } catch { message.error('获取视频信息失败'); }
  }, [projectId, scenes, message]);

  const confirmRegenerateShots = useCallback(async () => {
    if (!projectId || selectedShotIndices.length === 0) return;
    setShotSelectOpen(false);
    setRegeneratingShots(true);
    try {
      const latest = await videoService.getLatestByProject(projectId);
      if (!latest?.id) { message.error('未找到视频任务'); setRegeneratingShots(false); return; }
      const sorted = [...selectedShotIndices].sort((a, b) => a - b);
      for (const idx of sorted) {
        await videoService.regenerateShot(latest.id, idx);
      }
      message.success(`${sorted.length} 个分镜已提交重新生成`);
    } catch { message.error('分镜重新生成失败'); }
    setRegeneratingShots(false);
  }, [projectId, selectedShotIndices, message]);

  const handleViewVideo = useCallback(async () => {
    if (!projectId) return;
    try {
      const latest = await videoService.getLatestByProject(projectId);
      if (!latest) { message.warning('该项目还没有生成过视频，请先生成'); return; }
      navigate(`/projects/${projectId}/video?scriptId=${scriptId}`);
    } catch { message.error('获取视频失败'); }
  }, [projectId, scriptId, navigate, message]);

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
          voiceId={voiceId}
          subtitleEnabled={subtitleEnabled}
          subtitleFontSize={subtitleFontSize}
          subtitleOutline={subtitleOutline}
          onVoiceChange={handleVoiceChange}
          onSubtitleChange={handleSubtitleChange}
          onSubtitleFontSizeChange={handleSubFontSize}
          onSubtitleOutlineChange={handleSubOutline}
          customRequirement={customRequirement}
          subtitleColor={subtitleColor}
          subtitleFontFamily={subtitleFontFamily}
          onCustomRequirementChange={handleCustomReq}
          onSubtitleColorChange={handleSubColor}
          onSubtitleFontFamilyChange={handleSubFontFamily}
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
        <div className={styles.bottombarRight} style={{ gap: 8, display: 'flex' }}>
          <button
            className={styles.genBtn}
            onClick={handleViewVideo}
            disabled={!projectId}
            style={{ background: '#F3F4F6', color: '#374151' }}
          >
            <PlaySquareOutlined /> 查看视频
          </button>
          <button
            className={styles.genBtn}
            onClick={handleRegenerateShots}
            disabled={!scriptId || scenes.length === 0 || regeneratingShots}
            style={{ background: '#F3F4F6', color: '#374151' }}
          >
            <ReloadOutlined /> 生成分镜
          </button>
          <button
            className={styles.genBtn}
            onClick={handleGenerateVideo}
            disabled={!scriptId || scenes.length === 0 || generating}
          >
            <RocketOutlined /> 生成视频
          </button>
        </div>
      </div>

      {/* ====== 分镜选择 Modal ====== */}
      <Modal
        title="选择要重新生成的分镜"
        open={shotSelectOpen}
        onOk={confirmRegenerateShots}
        onCancel={() => setShotSelectOpen(false)}
        okText="开始生成"
        cancelText="取消"
        confirmLoading={regeneratingShots}
      >
        <p style={{ color: '#6B7280', marginBottom: 12, fontSize: 13 }}>
          选中分镜将按顺序重新生成，前一个分镜的结尾画面会传给下一个以保证连贯。
        </p>
        {scenes.map((s) => (
          <div key={s.index} style={{ marginBottom: 8 }}>
            <Checkbox
              checked={selectedShotIndices.includes(s.index)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedShotIndices((prev) => [...prev, s.index]);
                } else {
                  setSelectedShotIndices((prev) => prev.filter((i) => i !== s.index));
                }
              }}
            >
              Scene {String(s.index + 1).padStart(2, '0')} — {s.description?.slice(0, 24) || '(空)'}
            </Checkbox>
          </div>
        ))}
      </Modal>
    </div>
  );
}

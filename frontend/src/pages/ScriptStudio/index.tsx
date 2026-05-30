import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Skeleton, Tag, App } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { scriptService } from '@/services/scriptService';
import type { Scene, ScriptMode } from '@/types';
import styles from './ScriptStudio.module.css';

export default function ScriptStudio() {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const { message } = App.useApp();

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [scriptId, setScriptId] = useState('');
  // loading：进页面后一次性读取「项目已有剧本」，期间显示加载、避免空态闪现
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [mode, setMode] = useState<ScriptMode>('auto');

  // 进页面：若该项目此前已生成过剧本，直接回显（展示分镜列表），否则保持空态等待用户点击生成
  useEffect(() => {
    let cancelled = false;
    const load = projectId
      ? scriptService.getLatestByProject(projectId)
      : Promise.resolve(null);
    load
      .then((existing) => {
        if (cancelled) return;
        if (existing && existing.scenes.length > 0) {
          setScenes(existing.scenes);
          setScriptId(existing.id);
        }
      })
      .catch(() => { /* 无已有剧本或读取失败：保持空态 */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  const handleGenerate = async () => {
    setScenes([]);
    setGenerating(true);
    try {
      const pid = projectId || 'proj-demo-001';
      for await (const event of scriptService.generate({ project_id: pid, strategy_type: 'pain_point' })) {
        if (event.type === 'scene') {
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
  };

  const handleGenerateVideo = () => {
    const target = projectId
      ? `/projects/${projectId}/video?scriptId=${scriptId}`
      : `/video-creation?scriptId=${scriptId}`;
    navigate(target);
  };

  // 初次加载已有剧本中
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <h2>剧本工作室</h2>
          <p>正在加载已有剧本…</p>
          <Skeleton active paragraph={{ rows: 4 }} style={{ maxWidth: 520, margin: '24px auto 0', textAlign: 'left' }} />
        </div>
      </div>
    );
  }

  if (!scenes.length) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <h2>剧本工作室</h2>
          <p>基于商品信息，AI 自动生成带货视频分镜剧本</p>
          <Button type="primary" size="large" loading={generating} onClick={handleGenerate}
            style={{ borderRadius: 12, height: 48, fontSize: 15, fontWeight: 600, padding: '0 32px' }}>
            {generating ? 'AI 生成中...' : '生成剧本'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontFamily: 'Geist', fontSize: 20 }}>剧本工作室</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button onClick={handleGenerate} loading={generating}>重新生成</Button>
          {scriptId && (
            <Button type="primary" icon={<RocketOutlined />} onClick={handleGenerateVideo}
              style={{ borderRadius: 10, fontWeight: 600 }}>
              生成视频
            </Button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['auto','reference','template'] as ScriptMode[]).map((m) => (
          <Tag key={m} color={mode === m ? 'processing' : 'default'} style={{ borderRadius: 999, cursor: 'pointer' }}
            onClick={() => setMode(m)}>{m === 'auto' ? '自动化生成' : m === 'reference' ? '爆款仿写' : '灵感模板'}</Tag>
        ))}
      </div>

      {scenes.map((scene, i) => (
        <div key={i} style={{
          display: 'flex', gap: 16, padding: 16, marginBottom: 12,
          background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <img src={scene.thumb_url} alt="" style={{ width: 120, height: 68, borderRadius: 8, objectFit: 'cover', flexShrink: 0, background: '#F1F5F9' }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Tag color="blue" style={{ borderRadius: 999 }}>分镜 {i + 1}</Tag>
              <span style={{ fontSize: 12, color: '#6B7280' }}>{scene.duration || 3}s</span>
              <span style={{ fontSize: 12, color: '#6B7280', fontFamily: 'JetBrains Mono' }}>{scene.camera_motion}</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#111827', lineHeight: 1.6 }}>{scene.description}</p>
            {scene.voiceover && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6B7280' }}>配音：{scene.voiceover}</p>}
            {scene.subtitle && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9CA3AF' }}>字幕：{scene.subtitle}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

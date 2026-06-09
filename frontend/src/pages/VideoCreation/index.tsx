import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Tag, App } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, ShareAltOutlined, DownloadOutlined, CaretRightFilled, ThunderboltOutlined } from '@ant-design/icons';
import { videoService } from '@/services/videoService';
import { scriptService } from '@/services/scriptService';
import type { VideoShotStatus, VideoTask } from '@/types';
import styles from './VideoCreation.module.css';

const POLL_MS = 1500;
// 轮询安全上限：约 10 分钟，避免离开页面（浏览器后退手势）后 setInterval 永久泄漏
const MAX_POLLS = Math.ceil((10 * 60 * 1000) / POLL_MS);

const STATUS_PILL: Record<VideoShotStatus, string> = {
  queued: 'default', rendering: 'processing', completed: 'success', failed: 'error',
};
const STATUS_LABEL: Record<VideoShotStatus, string> = {
  queued: '排队中', rendering: '生成中', completed: '完成', failed: '失败',
};
const BAR_CLASS: Record<VideoShotStatus, string> = {
  queued: styles.barQueued, rendering: styles.barRendering, completed: styles.barCompleted, failed: styles.barFailed,
};

function fmt(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function VideoCreation() {
  const navigate = useNavigate();
  const { id: pid } = useParams<{ id: string }>();
  const [sp, setSp] = useSearchParams();
  const sid = sp.get('scriptId') || '';
  // regen=1：来自分镜编辑「整片重生」，进页面直接触发生成而非回显旧视频
  const regen = sp.get('regen') === '1';
  const { message } = App.useApp();

  const [task, setTask] = useState<VideoTask | null>(null);
  // busy: 已提交、正在生成/渲染中（从点击触发直到 completed/failed）
  const [busy, setBusy] = useState(false);
  // checking: 进页面后一次性查「项目是否已有完成视频」，期间显示加载、避免空闲态闪现
  const [checking, setChecking] = useState(true);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  // 防止 regen 自动触发被重复执行（StrictMode 双挂载 / 重渲染）
  const autoGenRef = useRef(false);

  const stopPolling = () => {
    if (poll.current) { clearInterval(poll.current); poll.current = null; }
  };

  const startPolling = (videoId: string, seed?: VideoTask) => {
    if (seed) setTask(seed);
    stopPolling();
    let ticks = 0;
    poll.current = setInterval(() => {
      if (++ticks > MAX_POLLS) { stopPolling(); setBusy(false); return; }
      videoService.getStatus(videoId).then((n) => {
        setTask(n);
        if (n.status === 'completed' || n.status === 'failed') {
          stopPolling();
          setBusy(false);
          if (n.status === 'completed') {
            videoService.getDownloadUrl(videoId).then((dl) => {
              setTask((prev) => (prev ? { ...prev, download_url: dl.url || dl.download_url } : prev));
            }).catch(() => {});
          }
        }
      }).catch(() => {});
    }, POLL_MS);
  };

  // 用户操作触发：解析真实剧本 → 提交生成请求 → 开始轮询。busy 防止重复点击 / 重复提交
  const handleGenerate = async () => {
    if (busy) return;
    stopPolling();
    setBusy(true);
    setTask(null);

    const projectId = pid || 'demo-project';

    // 解析真实 scriptId：URL 带了就用；否则查该项目最新剧本（避免发无效占位 id 让后端兜底）
    let scriptId = sid;
    if (!scriptId && pid) {
      try {
        const latest = await scriptService.getLatestByProject(pid);
        scriptId = latest?.id ?? '';
      } catch {
        /* 拦截器已 toast */
      }
    }
    if (!scriptId) {
      message.warning('请先生成剧本，再生成视频');
      setBusy(false);
      return;
    }

    videoService.generate({
      project_id: projectId,
      script_id: scriptId,
      voice_id: localStorage.getItem('vidcraft_voice_id') || 'zh_female_vv_uranus_bigtts',
      subtitle_enabled: localStorage.getItem('vidcraft_subtitle') !== 'false',
      subtitle_style: {
        font_size: Number(localStorage.getItem('vidcraft_sub_fontsize')) || 15,
        outline: Number(localStorage.getItem('vidcraft_sub_outline')) || 2.5,
        color: localStorage.getItem('vidcraft_sub_color') || '#FFFFFF',
        font_family: localStorage.getItem('vidcraft_sub_font') || 'Microsoft YaHei',
      },
      custom_requirement: localStorage.getItem('vidcraft_custom_req') || '',
    })
      .then((t) => {
        const videoId = t.id;
        if (!videoId) {
          message.error('视频任务创建失败');
          setBusy(false);
          return;
        }
        videoService.getStatus(videoId)
          .then((status) => startPolling(videoId, status))
          .catch(() => startPolling(videoId, t));
      })
      .catch(() => { setBusy(false); });
  };

  // 进页面：一次性读取该项目「已有的最新视频」并按状态恢复对应视图：
  //   - completed → 播放态；
  //   - rendering / queued（生成中）→ 恢复进度展示并继续轮询；
  //   - failed → 失败态（可重试）；
  //   - 无视频 → 空闲态（"开始生成"）。
  useEffect(() => {
    let cancelled = false;

    // 「整片重生」意图：不回显旧视频，直接触发一次生成。
    // 立即去掉 URL 上的 regen 标记，避免刷新 / 浏览器返回时重复整片重生。
    if (regen && !autoGenRef.current) {
      autoGenRef.current = true;
      setChecking(false);
      const next = new URLSearchParams(sp);
      next.delete('regen');
      setSp(next, { replace: true });
      handleGenerate();
      return () => { cancelled = true; };
    }

    const load = pid ? videoService.getLatestByProject(pid) : Promise.resolve(null);
    load
      .then((existing) => {
        if (cancelled || !existing) return;
        if (existing.status === 'completed' || existing.status === 'failed') {
          setTask(existing);
        } else if (existing.status === 'rendering' || existing.status === 'queued') {
          setBusy(true);
          startPolling(existing.id, existing);
        }
      })
      .catch(() => { /* 拦截器已 toast */ })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  // 卸载时兜底清理轮询，防止离开页面后 setInterval 泄漏
  useEffect(() => stopPolling, []);

  const leave = (to: number | string) => {
    stopPolling();
    if (typeof to === 'number') navigate(to);
    else navigate(to);
  };

  const done = task?.status === 'completed';
  const R = 85; const C = 2 * Math.PI * R;

  const handleDownload = async () => {
    if (!task?.id) return;
    const token = localStorage.getItem('vidcraft_access_token');
    const base = import.meta.env.VITE_API_BASE_URL || '/api';
    try {
      const res = await fetch(`${base}/videos/${task.id}/file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { message.error('下载失败'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vidcraft-${task.id.slice(0, 8)}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('下载已开始');
    } catch { message.error('下载失败'); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.hl}>
          <button className={styles.back} onClick={() => leave(pid ? `/projects/${pid}/script` : '/script-studio')}><ArrowLeftOutlined /></button>
          <h1 className={styles.tt}>项目详情：{task?.title || '智能视频生成'}</h1>
        </div>
        {done ? (
          <div className={styles.ha}>
            <button className={styles.ab} onClick={handleGenerate}><ReloadOutlined /> 重新生成</button>
            <button className={styles.ab}><ShareAltOutlined /> 分享</button>
            <button className={`${styles.ab} ${styles.exp}`} onClick={handleDownload}><DownloadOutlined /> 导出视频</button>
          </div>
        ) : task ? <span className={styles.tid}>TraceID: {task.render_id}</span> : null}
      </div>

      {/* 进页面读取已有视频中 */}
      {checking && (
        <div className={styles.gen}>
          <p className={styles.genSub}>正在加载项目视频…</p>
        </div>
      )}

      {/* 空闲态：必须由用户点击触发生成，不自动加载 */}
      {!checking && !busy && !task && (
        <div className={styles.gen}>
          <p className={styles.genTitle}>准备生成您的带货视频</p>
          <p className={styles.genSub}>点击下方按钮，AI 将根据当前脚本为您生成专属短视频</p>
          <button className={styles.genBtn} onClick={handleGenerate}><ThunderboltOutlined /> 开始生成视频</button>
        </div>
      )}

      {/* 失败态 */}
      {!checking && !busy && task && task.status === 'failed' && (
        <div className={styles.gen}>
          <p className={styles.genTitle} style={{ color: '#DC2626' }}>视频生成失败</p>
          <p className={styles.genSub}>{task.error_message || 'AI 视频生成未成功，可能是 Seedance 服务暂不可用'}</p>
          <button className={styles.genBtn} onClick={handleGenerate}><ReloadOutlined /> 重新生成</button>
        </div>
      )}

      {/* 渲染中 */}
      {busy && !done && (
        <div className={styles.gen}>
          <div className={styles.ringArea}>
            <svg viewBox="0 0 200 200" className={styles.ringSvg}>
              <defs><linearGradient id="rg" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#0EA5E9" /></linearGradient></defs>
              <circle cx="100" cy="100" r={R} fill="none" stroke="#E5E7EB" strokeWidth="10" />
              <circle cx="100" cy="100" r={R} fill="none" stroke="url(#rg)" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - (task?.progress ?? 0) / 100)} transform="rotate(-90 100 100)" style={{ transition: 'stroke-dashoffset 0.5s' }} />
            </svg>
            <div className={styles.ringCenter}>
              <span className={styles.ringLabel}>渲染中</span>
              <span className={styles.ringVal}>{task?.progress ?? 0}%</span>
            </div>
            <div className={styles.ringRemain}>⏱ 预计剩余时间：<strong>{fmt(task?.estimated_remaining ?? 0)}</strong></div>
          </div>
          <p className={styles.genTitle}>AI正在生成您的视频</p>
          <p className={styles.genSub}>正在为您精心制作专属短视频，请稍候片刻</p>

          {/* Shot render queue */}
          {task && task.shots.length > 0 && (
            <div className={styles.queueCard}>
              <div className={styles.queueHead}>
                <span className={styles.queueTitle}>分镜渲染队列</span>
                <span className={styles.queueMeta}>共 {task.shots.length} 个分镜</span>
              </div>
              {task.shots.map((shot, i) => (
                <div key={shot.id} className={styles.queueRow}>
                  <img src={shot.thumb_url} alt={shot.label} className={styles.queueThumb} />
                  <div className={styles.queueRowBody}>
                    <div className={styles.queueRowTitle}>
                      Scene 0{i + 1}
                      <span className={styles.queueRowMeta}>· {shot.label}</span>
                    </div>
                    <div className={styles.queueProgressTrack}>
                      <div className={`${styles.queueProgressBar} ${BAR_CLASS[shot.status]}`} style={{ width: `${shot.progress}%` }} />
                    </div>
                  </div>
                  <Tag color={STATUS_PILL[shot.status]} style={{ margin: 0, borderRadius: 999 }}>
                    {STATUS_LABEL[shot.status]}
                  </Tag>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {done && task && (
        <div className={styles.result}>
          <div className={styles.videoBox}>
            {(() => {
              const src = task.download_url ?? '';
              return src ? (
                <video key={src} className={styles.videoEl} src={src} poster={task.cover_url || undefined} controls playsInline />
              ) : (
                <div className={styles.videoPh}><CaretRightFilled /></div>
              );
            })()}
          </div>
          <p className={styles.resultTitle}>{task.title || '您的视频已生成完毕'}</p>
          <div className={styles.resultMeta}>
            <span>分辨率 {task.resolution || '1080×1920'}</span>
            <span>·</span>
            <span>画幅 {task.ratio || '9:16'}</span>
          </div>
        </div>
      )}

      {busy && !done && (
        <div className={styles.cancelArea}>
          <button className={styles.cancelBtn} onClick={async () => {
            if (task?.id) {
              try { await videoService.cancel(task.id); } catch { /* ignore */ }
            }
            stopPolling();
            setBusy(false);
            setTask(null);
          }}>取消任务</button>
        </div>
      )}
    </div>
  );
}

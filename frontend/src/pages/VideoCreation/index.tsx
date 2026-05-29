import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { App } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, ShareAltOutlined, DownloadOutlined, CaretRightFilled } from '@ant-design/icons';
import { videoService } from '@/services/videoService';
import type { VideoTask } from '@/types';
import styles from './VideoCreation.module.css';

const POLL_MS = 1500;

function fmt(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function VideoCreation() {
  const navigate = useNavigate();
  const { id: pid } = useParams<{ id: string }>();
  const [sp] = useSearchParams();
  const sid = sp.get('scriptId') || '';
  const { message } = App.useApp();

  const [task, setTask] = useState<VideoTask | null>(null);
  const [loading, setLoading] = useState(true);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const alive = useRef(true);
  const [key, setKey] = useState(0);

  useEffect(() => {
    alive.current = true;
    setLoading(true);

    const projectId = pid || 'demo-project';
    const scriptId = sid || 'demo-script';

    const startPolling = (videoId: string, seed?: VideoTask) => {
      if (!alive.current) return;
      if (seed) setTask(seed);
      setLoading(false);
      poll.current = setInterval(() => {
        videoService.getStatus(videoId).then((n) => {
          if (!alive.current) return;
          setTask(n);
          if (n.status === 'completed' || n.status === 'failed') {
            if (poll.current) { clearInterval(poll.current); poll.current = null; }
            if (n.status === 'completed') {
              videoService.getDownloadUrl(videoId).then((dl) => {
                setTask((prev) => prev ? { ...prev, download_url: dl.url || dl.download_url } : prev);
              }).catch(() => {});
            }
          }
        }).catch(() => {});
      }, POLL_MS);
    };

    videoService.generate({ project_id: projectId, script_id: scriptId })
      .then((t) => {
        if (!alive.current) return;
        const videoId = t.id;
        if (!videoId) {
          message.error('视频任务创建失败');
          setLoading(false);
          return;
        }
        videoService.getStatus(videoId)
          .then((status) => startPolling(videoId, status))
          .catch(() => startPolling(videoId, t));
      })
      .catch(() => { if (alive.current) setLoading(false); });

    return () => { alive.current = false; if (poll.current) clearInterval(poll.current); };
  }, [key, pid, sid, message]);

  if (loading || !task) return <div className={styles.page}><p className={styles.loading}>正在初始化视频任务...</p></div>;

  const done = task.status === 'completed';
  const R = 85; const C = 2 * Math.PI * R;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.hl}>
          <button className={styles.back} onClick={() => navigate(pid ? `/projects/${pid}/script` : '/script-studio')}><ArrowLeftOutlined /></button>
          <h1 className={styles.tt}>项目详情：{task.title || '智能视频生成'}</h1>
        </div>
        {done ? (
          <div className={styles.ha}>
            <button className={styles.ab} onClick={() => { setLoading(true); setTask(null); setKey((k) => k + 1); }}><ReloadOutlined /> 重新生成</button>
            <button className={styles.ab}><ShareAltOutlined /> 分享</button>
            <button className={`${styles.ab} ${styles.exp}`} onClick={() => message.success('导出已开始')}><DownloadOutlined /> 导出视频</button>
          </div>
        ) : <span className={styles.tid}>TraceID: {task.render_id}</span>}
      </div>

      {!done && (
        <div className={styles.gen}>
          <div className={styles.ringArea}>
            <svg viewBox="0 0 200 200" className={styles.ringSvg}>
              <defs><linearGradient id="rg" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#0EA5E9" /></linearGradient></defs>
              <circle cx="100" cy="100" r={R} fill="none" stroke="#E5E7EB" strokeWidth="10" />
              <circle cx="100" cy="100" r={R} fill="none" stroke="url(#rg)" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - task.progress / 100)} transform="rotate(-90 100 100)" style={{ transition: 'stroke-dashoffset 0.5s' }} />
            </svg>
            <div className={styles.ringCenter}>
              <span className={styles.ringLabel}>渲染中</span>
              <span className={styles.ringVal}>{task.progress}%</span>
            </div>
            <div className={styles.ringRemain}>⏱ 预计剩余时间：<strong>{fmt(task.estimated_remaining)}</strong></div>
          </div>

          <div className={styles.queue}>
            <div className={styles.qHead}><h3>分镜渲染队列</h3><span>共 {task.shots.length} 个分镜</span></div>
            {task.shots.map((s, i) => (
              <div key={i} className={styles.qRow}>
                <img src={s.thumb_url} alt="" className={styles.qThumb} />
                <div className={styles.qBody}>
                  <div className={styles.qTitle}>Scene 0{i + 1} · {s.label}</div>
                  <div className={styles.qTrack}><div className={`${styles.qBar} ${s.status === 'completed' ? styles.qbOk : s.status === 'rendering' ? styles.qbOn : styles.qbWait}`} style={{ width: `${s.progress}%` }} /></div>
                </div>
                <span className={`${styles.qPill} ${s.status === 'completed' ? styles.qpOk : s.status === 'rendering' ? styles.qpOn : styles.qpWait}`}>
                  {s.status === 'completed' ? 'COMPLETED' : s.status === 'rendering' ? '生成中' : '排队中'}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.cancelArea}><button className={styles.cancelBtn} onClick={() => navigate(-1)}>取消任务</button></div>
        </div>
      )}

      {done && (
        <div className={styles.done}>
          <div className={styles.playerArea}>
            <div className={styles.player}>
              {task.download_url ? (
                <video src={task.download_url} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
              ) : (
                <>{task.cover_url && <img src={task.cover_url} alt="" />}<button className={styles.playOverlay}><CaretRightFilled /></button></>
              )}
            </div>
            <div className={styles.meta}><div><span>RENDER_ID</span><strong>{task.render_id}</strong></div><div><span>RESOLUTION</span><strong>{task.resolution}</strong></div><div><span>STATUS</span><strong className={styles.mOk}>COMPLETED</strong></div><div><span>QUALITY</span><strong>HD</strong></div></div>
          </div>
          <div className={styles.sideList}><div className={styles.qHead}><h3>分镜列表</h3><span>{fmt(45)}</span></div>
            {task.shots.map((s, i) => (<div key={i} className={styles.sRow}><img src={s.thumb_url} alt="" /><div><strong>#0{i + 1} {s.label}</strong><p>{s.label}</p></div></div>))}
          </div>
        </div>
      )}
    </div>
  );
}

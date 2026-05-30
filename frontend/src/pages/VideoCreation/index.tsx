import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { App } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, ShareAltOutlined, DownloadOutlined, CaretRightFilled, ThunderboltOutlined } from '@ant-design/icons';
import { videoService } from '@/services/videoService';
import type { VideoTask } from '@/types';
import styles from './VideoCreation.module.css';

const POLL_MS = 1500;
// 轮询安全上限：约 10 分钟，避免离开页面（浏览器后退手势）后 setInterval 永久泄漏
const MAX_POLLS = Math.ceil((10 * 60 * 1000) / POLL_MS);

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
  // busy: 已提交、正在生成/渲染中（从点击触发直到 completed/failed）
  const [busy, setBusy] = useState(false);
  // checking: 进页面后一次性查「项目是否已有完成视频」，期间显示加载、避免空闲态闪现
  const [checking, setChecking] = useState(true);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // 用户操作触发：提交生成请求 → 开始轮询。busy 防止重复点击 / 重复提交
  const handleGenerate = () => {
    if (busy) return;
    stopPolling();
    setBusy(true);
    setTask(null);

    const projectId = pid || 'demo-project';
    const scriptId = sid || 'demo-script';

    videoService.generate({ project_id: projectId, script_id: scriptId })
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

  // 进页面：一次性读取该项目「已有的最新视频」。已完成 → 直接进播放态；
  // 否则保持空闲态（"开始生成"），用户触发生成的路径不受影响。
  // 注意：这是单次 GET（非自动提交生成），不会重现之前的双调问题。
  useEffect(() => {
    let cancelled = false;
    // checking 初始即 true；所有 setState 都放在异步回调里（避免 effect 体内同步 setState）
    const load = pid ? videoService.getLatestByProject(pid) : Promise.resolve(null);
    load
      .then((existing) => {
        if (cancelled) return;
        if (existing && existing.status === 'completed') setTask(existing);
      })
      .catch(() => { /* 拦截器已 toast；当作"无已有视频"处理 */ })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
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
            <button className={`${styles.ab} ${styles.exp}`} onClick={() => message.success('导出已开始')}><DownloadOutlined /> 导出视频</button>
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
          <button className={styles.cancelBtn} onClick={() => leave(-1)}>取消任务</button>
        </div>
      )}
    </div>
  );
}

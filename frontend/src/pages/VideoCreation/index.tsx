import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tag, App, Skeleton } from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  StepBackwardFilled,
  StepForwardFilled,
  PauseOutlined,
  SoundOutlined,
  FullscreenOutlined,
  PlayCircleFilled,
  CaretRightFilled,
} from '@ant-design/icons';

import { videoService } from '@/services/videoService';
import type { VideoShotStatus, VideoTask } from '@/types';
import styles from './VideoCreation.module.css';

const POLL_INTERVAL_MS = 800;

const STATUS_PILL: Record<VideoShotStatus, { color: string; label: string }> = {
  queued:     { color: 'default',    label: '排队中' },
  rendering:  { color: 'processing', label: '生成中' },
  completed:  { color: 'success',    label: 'COMPLETED' },
  failed:     { color: 'error',      label: '失败' },
};

function formatHMS(totalSec: number): string {
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function rangeOf(index: number, total: number, totalDurationSec = 45): string {
  // 简易：把总时长平分给 N 个分镜
  const slice = totalDurationSec / total;
  const start = index * slice;
  const end = start + slice;
  return `${formatHMS(start)} — ${formatHMS(end)}`;
}

export default function VideoCreation() {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const { message } = App.useApp();

  const [task, setTask] = useState<VideoTask | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // 每次 +1 触发一轮新的生成（mount 时 0，"重新生成"按钮 +1）
  const [generationKey, setGenerationKey] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    videoService
      .generate({
        project_id: projectId || 'demo-project',
        script_id: 'demo-script-001',
        ratio: '9:16',
      })
      .then((initial) => {
        if (!mountedRef.current) return;
        setTask(initial);
        setLoading(false);

        // 启动轮询
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => {
          videoService
            .getStatus(initial.id)
            .then((next) => {
              if (!mountedRef.current) return;
              setTask(next);
              if (next.status === 'completed' || next.status === 'failed') {
                if (pollRef.current) clearInterval(pollRef.current);
                pollRef.current = null;
              }
            })
            .catch(() => { /* 拦截器已 toast，下次再试 */ });
        }, POLL_INTERVAL_MS);
      })
      .catch(() => {
        if (mountedRef.current) setLoading(false);
      });

    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [generationKey, projectId]);

  const handleRegenerate = () => {
    // 在事件处理里做状态重置（不会触发 set-state-in-effect 规则）
    setLoading(true);
    setTask(null);
    message.info('重新生成视频任务');
    setGenerationKey((k) => k + 1);
  };

  const handleBack = () => {
    const target = projectId ? `/projects/${projectId}/script` : '/script-studio';
    navigate(target);
  };

  if (loading || !task) {
    return (
      <div className={styles.page}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  const isCompleted = task.status === 'completed';
  // SVG ring 数学
  const RADIUS = 85;
  const CIRC = 2 * Math.PI * RADIUS;
  const ringOffset = CIRC * (1 - task.progress / 100);

  return (
    <div className={styles.page}>
      {/* ============ Header ============ */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backBtn} onClick={handleBack} aria-label="返回">
            <ArrowLeftOutlined />
          </button>
          <h1 className={styles.title}>项目详情：{task.title || '智能视频生成'}</h1>
        </div>
        {isCompleted ? (
          <div className={styles.headerActions}>
            <button type="button" className={styles.actionBtn} onClick={handleRegenerate}>
              <ReloadOutlined /> 重新生成
            </button>
            <button type="button" className={styles.actionBtn}>
              <ShareAltOutlined /> 分享
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.exportBtn}`}
              onClick={() => message.success('导出已开始（mock）')}
            >
              <DownloadOutlined /> 导出视频
            </button>
          </div>
        ) : (
          <span className={styles.titleMeta}>TraceID: {task.render_id}</span>
        )}
      </div>

      {/* ============ Generating state ============ */}
      {!isCompleted && (
        <div className={styles.generatingShell}>
          {/* Progress ring */}
          <div className={styles.ringWrap}>
            <svg viewBox="0 0 200 200" className={styles.ringSvg}>
              <defs>
                <linearGradient id="vcRingGrad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#0EA5E9" />
                </linearGradient>
              </defs>
              <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="#E5E7EB" strokeWidth="10" />
              <circle
                cx="100"
                cy="100"
                r={RADIUS}
                fill="none"
                stroke="url(#vcRingGrad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 100 100)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className={styles.ringOverlay}>
              <div className={styles.ringLabel}>
                {task.status === 'queued' ? '排队中' : '渲染中'}
              </div>
              <div className={styles.ringValue}>{task.progress}%</div>
            </div>
            <div className={styles.ringRemain}>
              ⏱ 预计剩余时间：
              <span className={styles.ringRemainValue}>{formatHMS(task.estimated_remaining)}</span>
            </div>
          </div>

          {/* Render queue */}
          <div className={styles.queueCard}>
            <div className={styles.queueHead}>
              <span className={styles.queueTitle}>分镜渲染队列</span>
              <span className={styles.queueMeta}>共 {task.shots.length} 个分镜</span>
            </div>
            {task.shots.map((shot, i) => {
              const pill = STATUS_PILL[shot.status];
              return (
                <div key={shot.id} className={styles.queueRow}>
                  <img src={shot.thumb_url} alt={shot.label} className={styles.queueThumb} />
                  <div className={styles.queueRowBody}>
                    <div className={styles.queueRowTitle}>
                      Scene 0{i + 1}
                      <span className={styles.queueRowMeta}>· {shot.label}</span>
                    </div>
                    <div className={styles.queueProgressTrack}>
                      <div
                        className={`${styles.queueProgressBar} ${styles[shot.status]}`}
                        style={{ width: `${shot.progress}%` }}
                      />
                    </div>
                  </div>
                  <Tag color={pill.color} style={{ margin: 0, borderRadius: 999, minWidth: 80, textAlign: 'center' }}>
                    {pill.label}
                  </Tag>
                </div>
              );
            })}
          </div>

          <div className={styles.cancelArea}>
            <button type="button" className={styles.cancelBtn} onClick={handleBack}>
              取消任务
            </button>
          </div>
        </div>
      )}

      {/* ============ Completed state ============ */}
      {isCompleted && (
        <div className={styles.completedShell}>
          {/* Left: player + metadata */}
          <div>
            <div className={styles.playerWrap}>
              {task.cover_url && <img src={task.cover_url} alt="cover" />}
              <button type="button" className={styles.playOverlay} aria-label="播放">
                <div className={styles.playCircle}>
                  <CaretRightFilled />
                </div>
              </button>
              <div className={styles.playerControls}>
                <button aria-label="上一段"><StepBackwardFilled /></button>
                <button aria-label="播放/暂停">
                  <div className={styles.playMini}><PauseOutlined style={{ fontSize: 12 }} /></div>
                </button>
                <button aria-label="下一段"><StepForwardFilled /></button>
                <button aria-label="音量"><SoundOutlined /></button>
                <div className={styles.playerScrubber}>
                  <div className={styles.playerScrubberFill} />
                </div>
                <button aria-label="全屏"><FullscreenOutlined /></button>
              </div>
            </div>

            <div className={styles.metaRow}>
              <div>
                <div className={styles.metaLabel}>Render_ID</div>
                <div className={styles.metaValue}>{task.render_id}</div>
              </div>
              <div>
                <div className={styles.metaLabel}>Resolution</div>
                <div className={styles.metaValue}>{task.resolution}</div>
              </div>
              <div>
                <div className={styles.metaLabel}>Status</div>
                <div className={`${styles.metaValue} ${styles.metaValueOk}`}>COMPLETED</div>
              </div>
              <div>
                <div className={styles.metaLabel}>Quality</div>
                <div className={styles.metaValue}>{task.quality}</div>
              </div>
            </div>
          </div>

          {/* Right: scene list */}
          <div>
            <div className={styles.sceneListHead}>
              <span className={styles.sceneListTitle}>
                <PlayCircleFilled style={{ color: '#4648D4', marginRight: 6 }} />
                分镜列表
              </span>
              <span className={styles.sceneListMeta}>00:45</span>
            </div>
            {task.shots.map((shot, i) => (
              <div key={shot.id} className={styles.sceneListRow}>
                <img src={shot.thumb_url} alt={shot.label} className={styles.sceneListThumb} />
                <div className={styles.sceneListBody}>
                  <div className={styles.sceneListTitleRow}>
                    <span className={styles.sceneListMeta}>#0{i + 1}</span>
                    <span>{shot.label}</span>
                  </div>
                  <p className={styles.sceneListDesc}>{shot.label}</p>
                  <div className={styles.sceneListTime}>{rangeOf(i, task.shots.length)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

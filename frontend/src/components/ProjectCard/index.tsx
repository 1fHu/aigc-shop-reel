import { useNavigate } from 'react-router-dom';
import { Tag } from 'antd';
import { ClockCircleOutlined, EyeOutlined, MoreOutlined } from '@ant-design/icons';

import type { ProjectListItem, ProjectStatus } from '@/types';
import styles from './ProjectCard.module.css';

interface Props {
  project: ProjectListItem;
  /** 可选：覆盖卡片右上标签（如 "TIKTOK READY"） */
  topTag?: string;
  /** 可选：观看量展示 */
  views?: string;
  /** 可选：渲染中进度 0-100 */
  renderProgress?: number;
  /** 是否显示 3 点菜单（hover 出现） */
  showMenu?: boolean;
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  completed: { label: 'Completed', color: 'success' },
  in_progress: { label: 'Generating', color: 'warning' },
  draft: { label: '草稿', color: 'default' },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.round(hr / 24);
  if (day === 1) return '昨天';
  return `${day} 天前`;
}

/**
 * 项目卡片
 * Dashboard / Projects 共用
 */
export default function ProjectCard({
  project,
  topTag,
  views,
  renderProgress,
  showMenu = true,
}: Props) {
  const navigate = useNavigate();
  const statusCfg = STATUS_CONFIG[project.status] ?? { label: project.status, color: 'default' };
  const isGenerating = project.status === 'in_progress';

  return (
    <div
      className={styles.card}
      onClick={() => navigate(`/projects/${project.id}/video`)}
      role="button"
      tabIndex={0}
    >
      {showMenu && (
        <button
          className={styles.menuBtn}
          onClick={(e) => { e.stopPropagation(); /* TODO: open menu */ }}
          aria-label="更多操作"
        >
          <MoreOutlined />
        </button>
      )}

      <div className={styles.coverWrap}>
        <img src={project.cover_url} alt={project.name} className={styles.cover} />

        {isGenerating && (
          <div className={styles.generatingMask}>
            <span className={styles.generatingText}>
              {renderProgress !== undefined ? `${renderProgress}%...` : 'RENDERING...'}
            </span>
            {renderProgress !== undefined && (
              <div className={styles.progressTrack}>
                <div className={styles.progressBar} style={{ width: `${renderProgress}%` }} />
              </div>
            )}
          </div>
        )}

        {topTag && <span className={styles.topTag}>{topTag}</span>}
      </div>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{project.name}</h3>
          <Tag color={statusCfg.color} style={{ margin: 0, borderRadius: 999, fontSize: 11 }}>
            {statusCfg.label}
          </Tag>
        </div>
        <div className={styles.meta}>
          <span><ClockCircleOutlined /> {relativeTime(project.updated_at)}</span>
          {views && <span><EyeOutlined /> {views}</span>}
          {isGenerating && !views && <span style={{ color: '#D97706' }}>⏳ 等待完成</span>}
        </div>
      </div>
    </div>
  );
}

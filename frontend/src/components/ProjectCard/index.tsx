import { useNavigate } from 'react-router-dom';
import { Tag, Dropdown, App } from 'antd';
import { ClockCircleOutlined, EyeOutlined, MoreOutlined, DeleteOutlined } from '@ant-design/icons';

import { projectService } from '@/services/projectService';
import type { ProjectListItem, ProjectStatus } from '@/types';
import styles from './ProjectCard.module.css';

interface Props {
  project: ProjectListItem;
  topTag?: string;
  views?: string;
  renderProgress?: number;
  showMenu?: boolean;
  onDeleted?: () => void;
  /**
   * 自定义点击卡片行为。传入时覆盖默认的「跳转到 /video」。
   * 项目列表用它对已完成项目弹出工作台入口弹框（ProjectEntryModal）。
   */
  onOpen?: () => void;
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

export default function ProjectCard({
  project,
  topTag,
  views,
  renderProgress,
  showMenu = true,
  onDeleted,
  onOpen,
}: Props) {
  const navigate = useNavigate();
  const { modal } = App.useApp();
  const statusCfg = STATUS_CONFIG[project.status] ?? { label: project.status, color: 'default' };
  const isGenerating = project.status === 'in_progress';

  const handleDelete = () => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除项目「${project.name}」吗？删除后不可恢复。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        await projectService.remove(project.id);
        onDeleted?.();
      },
    });
  };

  const menuItems = [
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除项目',
      danger: true,
      onClick: (e: { domEvent: React.MouseEvent }) => {
        e.domEvent.stopPropagation();
        handleDelete();
      },
    },
  ];

  return (
    <div
        className={styles.card}
        onClick={() => (onOpen ? onOpen() : navigate(`/projects/${project.id}/materials`))}
        role="button"
        tabIndex={0}
      >
        {showMenu && (
          <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
            <button
              className={styles.menuBtn}
              onClick={(e) => e.stopPropagation()}
              aria-label="更多操作"
            >
              <MoreOutlined />
            </button>
          </Dropdown>
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

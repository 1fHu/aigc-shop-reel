import { useEffect, useMemo, useState } from 'react';
import { Table, Tag, Skeleton } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

import ProjectCard from '@/components/ProjectCard';
import NewProjectModal from '@/components/NewProjectModal';
import ProjectEntryModal from '@/components/ProjectEntryModal';
import { projectService } from '@/services/projectService';
import type { ProjectListItem, ProjectStatus } from '@/types';
import styles from './Projects.module.css';

type StatusFilter = 'all' | ProjectStatus;
type ViewMode = 'grid' | 'list';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all',         label: '全部' },
  { value: 'completed',   label: '已完成' },
  { value: 'in_progress', label: '生成中' },
  { value: 'draft',       label: '草稿' },
];

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

export default function Projects() {
  const [view, setView] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  // 已完成项目点击后弹出的工作台入口弹框；null 表示未打开
  const [entryProject, setEntryProject] = useState<ProjectListItem | null>(null);

  // 点击任意「已有项目」→ 弹出工作台入口弹框（素材库/分镜/风格/Video 四入口）。
  // 仅「新建项目」按钮走原创建流程（NewProjectModal → materials），不进此弹框。
  const openProject = (p: ProjectListItem) => {
    setEntryProject(p);
  };

  useEffect(() => {
    let cancelled = false;
    projectService
      .list({ page: 1, limit: 50 })
      .then((items) => { if (!cancelled) setProjects(items); })
      .catch(() => { /* 拦截器已 toast */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'all') return projects;
    return projects.filter((p) => p.status === statusFilter);
  }, [projects, statusFilter]);

  // 列表视图的 Table 列定义
  const columns: ColumnsType<ProjectListItem> = [
    {
      title: '项目名',
      dataIndex: 'name',
      key: 'name',
      render: (_, p) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src={p.cover_url}
            alt={p.name}
            style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
          />
          <span style={{ fontWeight: 500 }}>{p.name}</span>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s: ProjectStatus) => {
        const cfg = STATUS_CONFIG[s];
        return <Tag color={cfg.color} style={{ borderRadius: 999, margin: 0 }}>{cfg.label}</Tag>;
      },
    },
    {
      title: '视频数',
      dataIndex: 'video_count',
      key: 'video_count',
      width: 100,
      render: (v: number) => <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{v}</span>,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 140,
      render: (t: string) => <span style={{ color: '#6B7280' }}>{relativeTime(t)}</span>,
    },
    {
      title: '',
      key: 'action',
      width: 100,
      render: (_, p) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openProject(p);
          }}
          style={{
            background: 'none', border: 'none', color: '#4648D4',
            cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}
        >
          查看详情
        </button>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>项目管理</h1>
          <p className={styles.subtitle}>
            您共有 <span className={styles.subtitleCount}>{projects.length}</span> 个项目
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.viewToggle}>
            <button
              type="button"
              className={view === 'grid' ? styles.viewToggleActive : ''}
              onClick={() => setView('grid')}
              aria-label="网格视图"
            >
              <AppstoreOutlined />
            </button>
            <button
              type="button"
              className={view === 'list' ? styles.viewToggleActive : ''}
              onClick={() => setView('list')}
              aria-label="列表视图"
            >
              <UnorderedListOutlined />
            </button>
          </div>
          <button type="button" className={styles.createBtn} onClick={() => setModalOpen(true)}>
            <PlusOutlined /> 新建项目
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>状态</span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`${styles.filterChip} ${statusFilter === f.value ? styles.filterChipActive : ''}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className={styles.filterDivider} />

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>时间</span>
          <button type="button" className={styles.filterPill}>30 天 ▾</button>
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>分类</span>
          <button type="button" className={styles.filterPill}>所有类目 ▾</button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className={styles.grid}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton.Node key={i} active style={{ width: '100%', height: 300 }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredProjects.length === 0 && (
        <div className={styles.empty}>
          <h3>没有匹配的项目</h3>
          <p>试试切换筛选条件，或者新建一个项目</p>
        </div>
      )}

      {/* Grid view */}
      {!loading && view === 'grid' && filteredProjects.length > 0 && (
        <div className={styles.grid}>
          {filteredProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              renderProgress={p.status === 'in_progress' ? 75 : undefined}
              onOpen={() => openProject(p)}
              onDeleted={() => setProjects((cur) => cur.filter((item) => item.id !== p.id))}
            />
          ))}

          {/* "Create new" placeholder */}
          <button
            type="button"
            className={styles.placeholderCard}
            onClick={() => setModalOpen(true)}
          >
            <div className={styles.placeholderIconCircle}><PlusOutlined /></div>
            <div className={styles.placeholderTitle}>创建新项目</div>
            <div className={styles.placeholderSubtitle}>点击开启你的下一个 AIGC 创作</div>
          </button>
        </div>
      )}

      {/* List view */}
      {!loading && view === 'list' && filteredProjects.length > 0 && (
        <Table
          columns={columns}
          dataSource={filteredProjects}
          rowKey="id"
          pagination={false}
          onRow={(record) => ({
            onClick: () => openProject(record),
            style: { cursor: 'pointer' },
          })}
          style={{ background: '#fff', borderRadius: 16, overflow: 'hidden' }}
        />
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <span><strong style={{ fontFamily: 'Geist, sans-serif' }}>VidCraft</strong> © 2026 VidCraft AI Workstation</span>
        <div>
          <a href="#">服务条款</a><a href="#">隐私政策</a><a href="#">联系我们</a><a href="#">API</a>
        </div>
      </footer>

      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(p) => {
          setProjects((cur) => [p, ...cur]);
        }}
      />

      {/* 已完成项目的工作台入口弹框；右上角 X 关闭即返回项目列表 */}
      <ProjectEntryModal
        open={entryProject !== null}
        project={entryProject}
        onClose={() => setEntryProject(null)}
      />
    </div>
  );
}

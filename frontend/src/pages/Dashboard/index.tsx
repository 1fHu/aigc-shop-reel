import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Skeleton } from 'antd';
import {
  VideoCameraOutlined,
  CalendarOutlined,
  PlayCircleOutlined,
  ShoppingCartOutlined,
  PlusOutlined,
  CloudUploadOutlined,
  ThunderboltOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

import StatCard from '@/components/StatCard';
import ProjectCard from '@/components/ProjectCard';
import NewProjectModal from '@/components/NewProjectModal';
import { dashboardService } from '@/services/dashboardService';
import { useAuthStore, selectUser } from '@/stores/authStore';
import type { DashboardOverview, StatCardData } from '@/types';
import styles from './Dashboard.module.css';

const STAT_VARIANT_MAP: Record<StatCardData['key'], 'brand' | 'sky' | 'violet' | 'red'> = {
  total_videos: 'brand',
  monthly_new: 'sky',
  completion_rate: 'violet',
  gmv_rate: 'red',
};

const STAT_ICON_MAP: Record<StatCardData['key'], React.ReactNode> = {
  total_videos: <VideoCameraOutlined />,
  monthly_new: <CalendarOutlined />,
  completion_rate: <PlayCircleOutlined />,
  gmv_rate: <ShoppingCartOutlined />,
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '深夜好';
  if (h < 12) return '早安';
  if (h < 18) return '下午好';
  return '晚上好';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore(selectUser);

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dashboardService
      .getOverview()
      .then((resp) => { if (!cancelled) setData(resp); })
      .catch(() => { /* 拦截器已 toast */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const trendData = useMemo(() => {
    if (!data) return [];
    return data.performance_trend.map((p) => ({
      day: p.date.slice(8, 10),
      生成数: p.generated,
      观看量: p.views,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton.Input active block style={{ width: 240, height: 32, marginBottom: 8 }} />
        <Skeleton paragraph={{ rows: 1, width: ['40%'] }} active />
        <div className={styles.statsGrid} style={{ marginTop: 32 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton.Node key={i} active style={{ width: '100%', height: 160 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>
            {greeting()}，{user?.nickname || 'VidCrafter'}{' '}
            <span style={{ display: 'inline-block' }}>👋</span>
          </h1>
          <p className={styles.headerSubtitle}>准备好为您的 TikTok 商店创作下一个爆款视频了吗？</p>
        </div>
        <div className={styles.headerActions}>
          <Button icon={<PlusOutlined />} onClick={() => setNewProjectOpen(true)}>新建项目</Button>
          <Button icon={<CloudUploadOutlined />} onClick={() => setNewProjectOpen(true)}>上传素材</Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className={styles.statsGrid}>
        {data.stats.map((s) => (
          <StatCard
            key={s.key}
            icon={STAT_ICON_MAP[s.key]}
            variant={STAT_VARIANT_MAP[s.key]}
            label={s.label}
            value={s.value}
            trend={s.trend}
            trendDir={s.trend_dir}
            bars={s.bars}
          />
        ))}
      </div>

      {/* Recent + Trend */}
      <div className={styles.body}>
        {/* Recent projects */}
        <div>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>最近项目</h2>
            <button className={styles.viewAll} onClick={() => navigate('/projects')}>查看全部 →</button>
          </div>
          <div className={styles.recentGrid}>
            {data.recent_projects.map((p, i) => (
              <ProjectCard
                key={p.id}
                project={p}
                views={i === 0 ? '4.2k' : i === 2 ? '12.8k' : i === 3 ? '8.5k' : undefined}
                topTag={i === 0 ? 'TIKTOK READY' : undefined}
                renderProgress={p.status === 'in_progress' ? 85 : undefined}
              />
            ))}
          </div>
        </div>

        {/* Trend column */}
        <div>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>性能趋势</h2>
            <div className={styles.trendLegend}>
              <span><span className={styles.legendDot} style={{ background: '#4648D4' }} />生成数</span>
              <span><span className={styles.legendDot} style={{ background: '#0EA5E9' }} />观看量</span>
            </div>
          </div>

          <div className={styles.trendCard}>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={trendData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="lineBrand" x1="0" x2="1">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#4648D4" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E5E7EB' }} />
                <Line type="monotone" dataKey="生成数" stroke="url(#lineBrand)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="观看量" stroke="#0EA5E9" strokeWidth={2} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Highlight */}
          <div className={styles.highlightCard}>
            <div className={styles.highlightRow}>
              <div className={styles.highlightIconBox} style={{ background: '#EEF2FF', color: '#4648D4' }}>
                <RiseOutlined />
              </div>
              <div>
                <div className={styles.highlightLabel}>最高转化日</div>
                <div className={styles.highlightSubLabel}>{data.highlight.best_conversion.date}</div>
              </div>
              <div className={styles.highlightValue}>{data.highlight.best_conversion.rate}</div>
            </div>

            <div className={styles.highlightRow}>
              <div className={styles.highlightIconBox} style={{ background: '#FEF3C7', color: '#D97706' }}>
                <ThunderboltOutlined />
              </div>
              <div>
                <div className={styles.highlightLabel}>爆款潜力预测</div>
                <div className={styles.highlightSubLabel}>{data.highlight.viral_prediction.category}</div>
              </div>
              <span
                style={{
                  marginLeft: 'auto',
                  padding: '2px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  background: '#FEF3C7',
                  color: '#B45309',
                  textTransform: 'capitalize',
                }}
              >
                {data.highlight.viral_prediction.level}
              </span>
            </div>
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        <span>© 2026 VidCraft AI Workstation. 让视频营销更简单。</span>
        <div>
          <a href="#">服务条款</a>
          <a href="#">隐私政策</a>
          <a href="#">联系我们</a>
        </div>
      </footer>

      <NewProjectModal open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
    </div>
  );
}

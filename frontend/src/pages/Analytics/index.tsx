import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Skeleton, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EyeOutlined,
  PlayCircleOutlined,
  HeartOutlined,
  ShoppingCartOutlined,
  AccountBookOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';

import StatCard, { type StatCardVariant } from '@/components/StatCard';
import { analyticsService } from '@/services/analyticsService';
import type {
  AnalyticsKpi,
  AnalyticsKpiKey,
  AnalyticsMetric,
  AnalyticsOverview,
  AnalyticsTimeRange,
  VideoMetric,
} from '@/types';
import styles from './Analytics.module.css';

/** KPI 配色映射（复用 StatCard variant） */
const KPI_VARIANT: Record<AnalyticsKpiKey, StatCardVariant> = {
  views:           'brand',
  completion_rate: 'sky',
  engagement_rate: 'violet',
  conversion_rate: 'red',
  gmv:             'brand',
};

const KPI_ICON: Record<AnalyticsKpiKey, React.ReactNode> = {
  views:           <EyeOutlined />,
  completion_rate: <PlayCircleOutlined />,
  engagement_rate: <HeartOutlined />,
  conversion_rate: <ShoppingCartOutlined />,
  gmv:             <AccountBookOutlined />,
};

/** 热力图色阶映射：correlation 0-1 → 0-6 级 */
function getHeatLevel(v: number): number {
  if (v < 0.15) return 0;
  if (v < 0.30) return 1;
  if (v < 0.45) return 2;
  if (v < 0.60) return 3;
  if (v < 0.75) return 4;
  if (v < 0.90) return 5;
  return 6;
}

const METRIC_LABELS: Record<AnalyticsMetric, string> = {
  views:  'VIEWS',
  ctr:    'CTR',
  gmv:    'GMV',
  shares: 'SHARES',
};

const TIME_RANGE_LABELS: Record<AnalyticsTimeRange, string> = {
  '7d':  '7 天',
  '30d': '30 天',
  '90d': '90 天',
  'all': '全部',
};

function formatNumber(n: number): string {
  if (n >= 100_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  if (n >= 10_000) return `¥${(n / 1000).toFixed(1)}k`;
  return `¥${n.toLocaleString()}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/**
 * Analytics 数据分析页
 *
 * 4 大块：
 * 1. 顶部 5 张 KPI 卡（复用 StatCard）
 * 2. 因子 × 效果 热力图（自实现 table 渲染）
 * 3. AI 诊断报告卡（核心问题 + 3 条优化建议 + 跳 ScriptStudio CTA）
 * 4. 视频效果列表（Antd Table，可排序）
 */
export default function Analytics() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<AnalyticsTimeRange>('30d');

  useEffect(() => {
    let cancelled = false;
    analyticsService
      .getOverview(range)
      .then((resp) => { if (!cancelled) setData(resp); })
      .catch(() => { /* 拦截器统一 toast */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range]);

  const handleExport = () => {
    message.info('报表导出中（mock）');
  };

  const handleGoOptimize = () => {
    message.success('跳转剧本编辑器优化');
    navigate('/script-studio');
  };

  const handleCycleRange = () => {
    const order: AnalyticsTimeRange[] = ['7d', '30d', '90d', 'all'];
    const next = order[(order.indexOf(range) + 1) % order.length];
    setRange(next);
  };

  // Table 列定义
  const columns: ColumnsType<VideoMetric> = [
    {
      title: '视频',
      key: 'video',
      width: 280,
      render: (_, v) => (
        <div className={styles.videoThumbCell}>
          <img src={v.cover_url} alt={v.name} className={styles.videoThumb} />
          <div className={styles.videoNameStack}>
            <span className={styles.videoName}>{v.name}</span>
            <span className={styles.videoMeta}>{formatDate(v.published_at)}</span>
          </div>
        </div>
      ),
    },
    {
      title: '观看量',
      dataIndex: 'views',
      key: 'views',
      sorter: (a, b) => a.views - b.views,
      render: (v: number) => <span className={styles.metricMono}>{formatNumber(v)}</span>,
    },
    {
      title: '完播率',
      dataIndex: 'completion_rate',
      key: 'completion_rate',
      sorter: (a, b) => a.completion_rate - b.completion_rate,
      defaultSortOrder: 'descend',
      render: (v: number) => <span className={styles.metricMono}>{v.toFixed(1)}%</span>,
    },
    {
      title: 'CTR',
      dataIndex: 'ctr',
      key: 'ctr',
      sorter: (a, b) => a.ctr - b.ctr,
      render: (v: number) => <span className={styles.metricMono}>{v.toFixed(1)}%</span>,
    },
    {
      title: 'GMV',
      dataIndex: 'gmv',
      key: 'gmv',
      sorter: (a, b) => a.gmv - b.gmv,
      render: (v: number) => <span className={styles.gmvCell}>{formatCurrency(v)}</span>,
    },
    {
      title: '',
      key: 'action',
      width: 80,
      render: () => (
        <button
          type="button"
          className={styles.detailLink}
          onClick={() => message.info('视频详情页待实现')}
        >
          查看详情
        </button>
      ),
    },
  ];

  if (loading || !data) {
    return (
      <div className={styles.page}>
        <Skeleton.Input active block style={{ width: 280, height: 28, marginBottom: 8 }} />
        <Skeleton paragraph={{ rows: 1, width: ['50%'] }} active />
        <div className={styles.skelGrid} style={{ marginTop: 32 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton.Node key={i} active style={{ width: '100%', height: 140 }} />
          ))}
        </div>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  // 热力图列（从第一行 row 拿，narrow 到 AnalyticsMetric 联合类型）
  const metricKeys = Object.keys(data.factor_impact_matrix[0]?.values || {}) as AnalyticsMetric[];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>数据分析概览</h1>
            <span className={styles.titlePill}>ANALYTICS</span>
          </div>
          <p className={styles.subtitle}>基于 AI 模型的多维视频效果归因分析</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.rangeBtn} onClick={handleCycleRange}>
            {TIME_RANGE_LABELS[range]} ▾
          </button>
          <button type="button" className={styles.exportBtn} onClick={handleExport}>
            <DownloadOutlined /> 导出报表
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpiRow}>
        {data.kpis.map((k: AnalyticsKpi) => (
          <StatCard
            key={k.key}
            icon={KPI_ICON[k.key]}
            variant={KPI_VARIANT[k.key]}
            label={k.label}
            value={k.value}
            trend={k.trend}
            trendDir={k.trend_dir}
            bars={k.bars}
          />
        ))}
      </div>

      {/* Heatmap + Diagnosis 2-column */}
      <div className={styles.body}>
        {/* Heatmap */}
        <div className={styles.heatCard}>
          <div className={styles.heatHead}>
            <span className={styles.heatTitle}>生成因子 × 转化效果 矩阵分析</span>
            <div className={styles.heatLegend}>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#F1F5F9' }} /> 弱
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#818CF8' }} /> 中
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#4648D4' }} /> 强相关
              </span>
            </div>
          </div>
          <table className={styles.heatTable}>
            <thead>
              <tr>
                <th>生成因子</th>
                {metricKeys.map((m) => (
                  <th key={m}>{METRIC_LABELS[m]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.factor_impact_matrix.map((row) => (
                <tr key={row.factor}>
                  <td className={styles.heatFactorCell}>{row.factor_label}</td>
                  {metricKeys.map((m) => {
                    const v = row.values[m] ?? 0;
                    const level = getHeatLevel(v);
                    return (
                      <td key={m}>
                        <div className={styles.heatCellWrap}>
                          <div className={`${styles.heatCell} ${styles['heat' + level]}`}>
                            {v.toFixed(2)}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Diagnosis */}
        <div className={styles.diagCard}>
          <div className={styles.diagHead}>
            <div className={styles.diagIconBox}>
              <ExperimentOutlined />
            </div>
            <span className={styles.diagTitle}>AI 诊断报告</span>
          </div>

          <div className={styles.diagIssueBox}>
            <div className={styles.diagIssueLabel}>核心问题</div>
            <h4 className={styles.diagIssueTitle}>{data.diagnosis.core_issue.title}</h4>
            <p className={styles.diagIssueDesc}>{data.diagnosis.core_issue.description}</p>
          </div>

          <div className={styles.diagSuggestionList}>
            {data.diagnosis.suggestions.map((s, i) => (
              <div key={i} className={styles.diagSuggestion}>
                <div className={styles.diagSuggestionNum}>{i + 1}</div>
                <div className={styles.diagSuggestionBody}>
                  <h5 className={styles.diagSuggestionTitle}>{s.title}</h5>
                  <p className={styles.diagSuggestionDesc}>{s.description}</p>
                </div>
              </div>
            ))}
          </div>

          <button type="button" className={styles.diagCta} onClick={handleGoOptimize}>
            立即优化脚本 <ArrowRightOutlined />
          </button>
        </div>
      </div>

      {/* Video list */}
      <div className={styles.videoCard}>
        <div className={styles.videoCardHead}>
          <span className={styles.videoCardTitle}>视频效果列表</span>
        </div>
        <Table
          columns={columns}
          dataSource={data.top_videos}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </div>
    </div>
  );
}

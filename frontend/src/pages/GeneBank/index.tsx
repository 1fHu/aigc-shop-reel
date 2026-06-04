import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Skeleton, App } from 'antd';
import { SearchOutlined, FireOutlined, ClockCircleOutlined, StarFilled } from '@ant-design/icons';

import ViralReportDrawer from '@/components/ViralReportDrawer';
import { genebankService } from '@/services/genebankService';
import {
  VIRAL_PLATFORM_LABELS,
  type ViralCard,
  type ViralPlatform,
  type ViralRecommendedFactors,
} from '@/types';
import styles from './GeneBank.module.css';

type CategoryFilter = 'all' | 'beauty' | 'electronics' | 'sports' | 'home' | 'food' | 'fashion' | 'mother_baby' | 'pet';

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all',         label: '全部' },
  { value: 'beauty',      label: '美妆' },
  { value: 'electronics', label: '电子产品' },
  { value: 'sports',      label: '运动' },
  { value: 'home',        label: '家居' },
  { value: 'food',        label: '食品' },
  { value: 'fashion',     label: '服饰' },
  { value: 'mother_baby', label: '母婴' },
  { value: 'pet',         label: '宠物' },
];

const PLATFORM_OPTIONS: Array<{ value: ViralPlatform | 'all'; label: string }> = [
  { value: 'all',       label: '全部平台' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'youtube',   label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = Math.floor(diff / 86_400_000);
  if (day === 0) return '今天';
  if (day === 1) return '昨天';
  if (day < 7) return `${day} 天前`;
  if (day < 30) return `${Math.floor(day / 7)} 周前`;
  return `${Math.floor(day / 30)} 个月前`;
}

/**
 * 爆款模板库（GeneBank）
 *
 * 入口：ProjectEntryModal "风格模板" 按钮跳过来。
 *
 * 数据流：
 * 1. 进页面 → genebankService.search() 拉爆款视频列表
 * 2. 用户点击卡片 → 打开 ViralReportDrawer 显示 AI 拆解报告
 * 3. 用户勾选 recommended_factors → 应用到剧本生成
 *    （目前先用 sessionStorage 存，下次进 ScriptStudio 时读出来）
 */
export default function GeneBank() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [cards, setCards] = useState<ViralCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [platform, setPlatform] = useState<ViralPlatform | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    genebankService
      .search({ limit: 24 })
      .then((data) => {
        if (!cancelled) {
          // 按 ID 排序，确保视频顺序固定
          const sorted = data.sort((a, b) => a.id.localeCompare(b.id));
          setCards(sorted);
        }
      })
      .catch(() => { /* 拦截器统一 toast */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // 客户端筛选（数据量小，无需重新请求）
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return cards.filter((c) => {
      if (category !== 'all' && c.analysis_report.category !== category) return false;
      if (platform !== 'all' && c.platform !== platform) return false;
      if (kw) {
        const blob = `${c.title} ${JSON.stringify(c.analysis_report)}`.toLowerCase();
        if (!blob.includes(kw)) return false;
      }
      return true;
    });
  }, [cards, category, platform, keyword]);

  const handleApplyFactors = (cardId: string, factors: Partial<ViralRecommendedFactors>) => {
    // 暂存到 sessionStorage，ScriptStudio 进入时读出并预设
    // ⚠️ Backend coordination: 待与后端约定如何把这些因子带给 POST /scripts/generate
    sessionStorage.setItem('genebank_applied', JSON.stringify({
      viral_id: cardId,
      factors,
      applied_at: new Date().toISOString(),
    }));
    message.success('因子已保存，进入剧本编辑可看到预设');
    // 暂时跳 ScriptStudio（顶层入口，无项目 id 时用 demo）
    navigate('/script-studio');
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>爆款模板库</h1>
          <p className={styles.subtitle}>
            探索经过 AI 智能解析的优质带货视频，借鉴 Hook 手法 / 节奏 / 视觉风格，一键生成同款剧本
          </p>
        </div>
        <div className={styles.searchWrap}>
          <Input
            size="large"
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            placeholder="搜索标题 / 卖点 / 风格..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            allowClear
          />
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>品类</span>
          {CATEGORY_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`${styles.filterChip} ${category === c.value ? styles.filterChipActive : ''}`}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className={styles.filterDivider} />

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>平台</span>
          {PLATFORM_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`${styles.filterChip} ${platform === p.value ? styles.filterChipActive : ''}`}
              onClick={() => setPlatform(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className={styles.skelGrid}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton.Node key={i} active style={{ width: '100%', height: 340 }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className={styles.empty}>
          <h3>没有匹配的爆款模板</h3>
          <p>试试切换品类或平台筛选，或清空搜索词</p>
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className={styles.grid}>
          {filtered.map((card) => (
            <button
              key={card.id}
              type="button"
              className={styles.card}
              onClick={() => setOpenId(card.id)}
            >
              <div className={styles.cardCover}>
                <img src={card.thumbnail_url} alt={card.title} />
                <span className={styles.platformPill}>
                  {VIRAL_PLATFORM_LABELS[card.platform]}
                </span>
                {card.performance_score !== null && (
                  <span className={styles.scorePill}>
                    <StarFilled style={{ fontSize: 9 }} /> {card.performance_score}
                  </span>
                )}
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{card.title}</h3>
                <div className={styles.cardChips}>
                  <span className={`${styles.cardChip} ${styles.cardChipBrand}`}>
                    <FireOutlined /> {card.analysis_report.shot_count} 镜
                  </span>
                  {card.analysis_report.style_tags.slice(0, 2).map((t) => (
                    <span key={t} className={styles.cardChip}>{t}</span>
                  ))}
                </div>
                <div className={styles.cardMeta}>
                  <span><ClockCircleOutlined /> {relativeTime(card.created_at)}</span>
                  <span>{CATEGORY_OPTIONS.find((c) => c.value === card.analysis_report.category)?.label || card.analysis_report.category}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Report Drawer */}
      <ViralReportDrawer
        open={openId !== null}
        cardId={openId}
        onClose={() => setOpenId(null)}
        onApplyFactors={handleApplyFactors}
      />
    </div>
  );
}

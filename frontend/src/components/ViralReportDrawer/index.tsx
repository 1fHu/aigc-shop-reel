import { useEffect, useState } from 'react';
import { Drawer, Skeleton, Tag, Button } from 'antd';
import {
  ThunderboltOutlined,
  FireOutlined,
  ClockCircleOutlined,
  BgColorsOutlined,
  TrophyOutlined,
  StarFilled,
  CheckCircleFilled,
} from '@ant-design/icons';

import { genebankService } from '@/services/genebankService';
import {
  VIRAL_PLATFORM_LABELS,
  type ViralCard,
  type ViralRecommendedFactors,
} from '@/types';
import styles from './ViralReportDrawer.module.css';

interface Props {
  open: boolean;
  cardId: string | null;
  onClose: () => void;
  /** @deprecated 抽屉已移除"应用因子并去剧本"入口，此 prop 不再被调用（保留以兼容父组件透传） */
  onApplyFactors?: (cardId: string, factors: Partial<ViralRecommendedFactors>) => void;
}

const FACTOR_LABELS: Record<keyof ViralRecommendedFactors, string> = {
  visual_style: '视觉风格',
  opener:       '开场手法',
  narration:    '旁白风格',
  pacing:       '节奏密度',
  cta:          'CTA 形式',
};

const FACTOR_KEYS = Object.keys(FACTOR_LABELS) as Array<keyof ViralRecommendedFactors>;

/**
 * 爆款视频拆解报告抽屉
 *
 * 用户点击 GeneBank 卡片后弹出：
 * 1. 顶部：视频基本信息（缩略图、标题、平台、性能分）
 * 2. 4 块拆解报告（Hook / 卖点 / 节奏 / 风格）
 * 3. 推荐创作因子勾选表（默认全勾，用户可单独取消）
 * 4. 底部 "应用因子并去剧本" CTA
 */
export default function ViralReportDrawer({ open, cardId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<ViralCard | null>(null);

  useEffect(() => {
    if (!open || !cardId) return;
    let cancelled = false;
    genebankService
      .getById(cardId)
      .then((data) => { if (!cancelled) setCard(data); })
      .catch(() => { /* 拦截器统一 toast */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // ⚠️ 由于 destroyOnClose，每次打开 Drawer 都是新实例：loading 初值 true、card 初值 null
  }, [open, cardId]);

  const report = card?.analysis_report;
  const factors = report?.recommended_factors;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={520}
      title={card ? card.title : 'AI 拆解报告'}
      destroyOnClose
      placement="right"
    >
      {loading && <Skeleton active paragraph={{ rows: 8 }} />}

      {!loading && card && (
        <div className={styles.body}>
          {/* 顶部：视频播放器 */}
          <div className={styles.header}>
            <div className={styles.videoBox}>
              {card.video_url ? (
                <video
                  controls
                  preload="metadata"
                  style={{ width: '100%', maxHeight: '400px', borderRadius: '8px', backgroundColor: '#000' }}
                >
                  <source src={`http://localhost:3000${card.video_url}`} type="video/mp4" />
                  您的浏览器不支持视频播放
                </video>
              ) : (
                <div className={styles.thumbBox}>
                  <img src={card.thumbnail_url} alt={card.title} />
                </div>
              )}
              <span className={styles.platformPill}>
                {VIRAL_PLATFORM_LABELS[card.platform]}
              </span>
            </div>
            <div className={styles.headerMeta}>
              <div className={styles.metaRow}>
                <TrophyOutlined style={{ color: '#F59E0B' }} />
                <span className={styles.metaLabel}>性能评分</span>
                <span className={styles.metaValue}>
                  {card.performance_score ?? '--'} / 100
                </span>
              </div>
              {card.source_url && (
                <div className={styles.sourceUrl}>
                  来源：<a href={card.source_url} target="_blank" rel="noreferrer">{card.source_url}</a>
                </div>
              )}
            </div>
          </div>

          {/* 4 块拆解报告 */}
          <div className={styles.reportSection}>
            <div className={styles.sectionTitle}>
              <ThunderboltOutlined /> Hook 手法
            </div>
            <p className={styles.sectionText}>{report?.hook}</p>
          </div>

          {report?.selling_points && report.selling_points.length > 0 && (
            <div className={styles.reportSection}>
              <div className={styles.sectionTitle}>
                <FireOutlined /> 核心卖点
              </div>
              <ul className={styles.bullets}>
                {report.selling_points.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}

          <div className={styles.reportSection}>
            <div className={styles.sectionTitle}>
              <ClockCircleOutlined /> 节奏 · {report?.shot_count} 个分镜
            </div>
            <p className={styles.sectionText}>{report?.rhythm}</p>
          </div>

          <div className={styles.reportSection}>
            <div className={styles.sectionTitle}>
              <BgColorsOutlined /> 视觉风格
            </div>
            {report?.visual_palette && (
              <p className={styles.sectionText}>调色板：{report.visual_palette}</p>
            )}
            <div className={styles.tagRow}>
              {report?.style_tags.map((t) => (
                <Tag key={t} color="purple" style={{ borderRadius: 999 }}>{t}</Tag>
              ))}
            </div>
          </div>

          {report?.highlights && report.highlights.length > 0 && (
            <div className={styles.highlightBox}>
              <div className={styles.highlightTitle}>
                <StarFilled style={{ color: '#F59E0B' }} /> AI 提取的亮点
              </div>
              <ul className={styles.highlightList}>
                {report.highlights.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          )}

          {/* 推荐创作因子勾选区 */}
          {factors && (
            <div className={styles.factorBox}>
              <div className={styles.factorTitle}>
                <CheckCircleFilled style={{ color: '#4648D4' }} /> 推荐创作因子
              </div>
              <p className={styles.factorHint}>AI 从该视频拆解出的创作因子。</p>
              <div className={styles.factorList}>
                {FACTOR_KEYS.map((key) => (
                  <div key={key} className={styles.factorRow}>
                    <CheckCircleFilled style={{ color: '#4648D4', marginRight: 8 }} />
                    <span className={styles.factorRowLabel}>{FACTOR_LABELS[key]}</span>
                    <span className={styles.factorRowArrow}>→</span>
                    <span className={styles.factorRowValue}>{factors[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 底部 */}
          <div className={styles.footer}>
            <Button onClick={onClose} disabled={loading}>关闭</Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}

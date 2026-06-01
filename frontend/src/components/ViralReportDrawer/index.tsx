import { useEffect, useState } from 'react';
import { Drawer, Skeleton, Tag, Checkbox, Button, App } from 'antd';
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
  /** 用户勾选完因子后点"应用并去剧本" */
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
export default function ViralReportDrawer({ open, cardId, onClose, onApplyFactors }: Props) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<ViralCard | null>(null);
  const [pickedFactors, setPickedFactors] = useState<Set<keyof ViralRecommendedFactors>>(
    new Set(FACTOR_KEYS),
  );

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

  const handleToggleFactor = (key: keyof ViralRecommendedFactors) => {
    setPickedFactors((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleApply = () => {
    if (!card?.analysis_report.recommended_factors || !cardId) return;
    if (pickedFactors.size === 0) {
      message.warning('请至少勾选一个创作因子');
      return;
    }
    const rec = card.analysis_report.recommended_factors;
    const result: Partial<ViralRecommendedFactors> = {};
    pickedFactors.forEach((k) => { result[k] = rec[k]; });
    onApplyFactors?.(cardId, result);
    message.success('已应用所选创作因子');
    onClose();
  };

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
          {/* 顶部：视频基本信息 */}
          <div className={styles.header}>
            <div className={styles.thumbBox}>
              <img src={card.thumbnail_url} alt={card.title} />
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
              <div className={styles.complianceHint}>
                ⚠️ 仅 AI 结构化分析，未存储原视频内容
              </div>
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
                <CheckCircleFilled style={{ color: '#4648D4' }} /> 推荐创作因子（可勾选）
              </div>
              <p className={styles.factorHint}>勾选要继承的因子，应用后用于剧本生成。</p>
              <div className={styles.factorList}>
                {FACTOR_KEYS.map((key) => (
                  <label key={key} className={styles.factorRow}>
                    <Checkbox
                      checked={pickedFactors.has(key)}
                      onChange={() => handleToggleFactor(key)}
                    >
                      <span className={styles.factorRowLabel}>{FACTOR_LABELS[key]}</span>
                      <span className={styles.factorRowArrow}>→</span>
                      <span className={styles.factorRowValue}>{factors[key]}</span>
                    </Checkbox>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 底部 CTA */}
          <div className={styles.footer}>
            <Button onClick={onClose} disabled={loading}>取消</Button>
            <Button
              type="primary"
              size="large"
              disabled={!factors}
              onClick={handleApply}
              className={styles.applyBtn}
            >
              应用因子并去剧本 →
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}

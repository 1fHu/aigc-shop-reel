import type { ReactNode } from 'react';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';

import type { StatTrendDirection } from '@/types';
import styles from './StatCard.module.css';

export type StatCardVariant = 'brand' | 'sky' | 'violet' | 'red';

interface Props {
  icon: ReactNode;
  variant?: StatCardVariant;
  label: string;
  value: string;
  trend?: string;
  trendDir?: StatTrendDirection;
  bars?: number[];
}

const VARIANTS: Record<StatCardVariant, { iconBg: string; iconColor: string; bars: string[] }> = {
  brand: {
    iconBg: '#EEF2FF',
    iconColor: '#4648D4',
    bars: ['#C7D2FE', '#A5B4FC', '#818CF8', '#6366F1', '#4648D4', '#4338CA', '#312E81'],
  },
  sky: {
    iconBg: '#ECFEFF',
    iconColor: '#0E7490',
    bars: ['#A5F3FC', '#67E8F9', '#22D3EE', '#06B6D4', '#0891B2', '#0E7490', '#155E75'],
  },
  violet: {
    iconBg: '#F5F3FF',
    iconColor: '#8B5CF6',
    bars: ['#DDD6FE', '#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6'],
  },
  red: {
    iconBg: '#FEF2F2',
    iconColor: '#DC2626',
    bars: ['#FECACA', '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#B91C1C', '#991B1B'],
  },
};

const TREND_COLOR: Record<StatTrendDirection, string> = {
  up: '#059669',
  down: '#DC2626',
  flat: '#9CA3AF',
};

/**
 * 统计卡片
 * Dashboard / Analytics 共用
 */
export default function StatCard({
  icon,
  variant = 'brand',
  label,
  value,
  trend,
  trendDir = 'flat',
  bars = [],
}: Props) {
  const colorTokens = VARIANTS[variant];

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div
          className={styles.iconBox}
          style={{ background: colorTokens.iconBg, color: colorTokens.iconColor }}
        >
          {icon}
        </div>
        {trend && (
          <span className={styles.trend} style={{ color: TREND_COLOR[trendDir] }}>
            {trendDir === 'up' && <ArrowUpOutlined style={{ fontSize: 11 }} />}
            {trendDir === 'down' && <ArrowDownOutlined style={{ fontSize: 11 }} />}
            {trendDir === 'flat' && <MinusOutlined style={{ fontSize: 11 }} />}
            {trend}
          </span>
        )}
      </div>

      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>

      {bars.length > 0 && (
        <div className={styles.bars}>
          {bars.map((h, i) => (
            <div
              key={i}
              className={styles.bar}
              style={{
                height: `${h}%`,
                background: colorTokens.bars[i % colorTokens.bars.length],
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { useLanguageStore } from '../stores/languageStore';
import { t } from './index';

export function displayText(value: string | null | undefined): string {
  return value ? t(value) : '';
}

export function formatDate(value: string | number | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(useLanguageStore.getState().language, options);
}

export function formatNumber(value: number): string {
  return value.toLocaleString(useLanguageStore.getState().language);
}

const metricSources: Record<string, string> = {
  total_videos: '总视频创作数', monthly_new: '本月新增创作', completion_rate: '完播率',
  gmv_rate: 'GMV 转化率', views: '观看量', engagement_rate: '互动率', conversion_rate: '转化率', gmv: 'GMV',
  visual_style: '视觉风格', opener: '开场手法', narration: '旁白风格', pacing: '节奏密度', cta: 'CTA 形式',
};

export function metricLabel(key: string, fallback: string): string {
  return t(metricSources[key] ?? fallback);
}

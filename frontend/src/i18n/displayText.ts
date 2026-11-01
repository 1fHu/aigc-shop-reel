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

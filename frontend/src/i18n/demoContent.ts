import { t } from './index';

/** Only known read-only demo fields may be localized. Editable and user content stays raw. */
const demoFields: Record<string, readonly string[]> = {};

export function demoText(id: string, source: string): string {
  return demoFields[id]?.includes(source) ? t(source) : source;
}

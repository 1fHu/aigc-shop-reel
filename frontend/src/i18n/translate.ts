import enUS from './locales/en-US';
import zhCN from './locales/zh-CN';
import type { Language } from '../stores/languageStore';

type Values = Record<string, string | number>;
const english: Record<string, string> = enUS;
const chinese: Record<string, string> = zhCN;
const sources = new Map(Object.entries(english).map(([source, translated]) => [translated, source]));
const own = (object: Record<string, string>, key: string) => Object.prototype.hasOwnProperty.call(object, key);
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Match only complete, known system messages. Captured user values are never translated.
const patterns = Object.entries(english).flatMap(([source, translated]) => {
  if (!/\{\w+\}/.test(source)) return [];
  return [source, translated].map((text) => {
    const names: string[] = [];
    const parts = text.split(/(\{\w+\})/g).map((part) => {
      if (!/^\{\w+\}$/.test(part)) return escape(part);
      names.push(part.slice(1, -1));
      return '([\\s\\S]*?)';
    });
    return { source, names, expression: new RegExp('^' + parts.join('') + '$') };
  });
});

export function translateText(source: string, language: Language, values: Values = {}): string {
  const dictionary = language === 'zh-CN' ? chinese : english;
  let key = own(english, source) ? source : sources.get(source) ?? source;
  let captured: Values = {};
  if (!own(english, key)) {
    for (const pattern of patterns) {
      const match = pattern.expression.exec(source);
      if (!match) continue;
      key = pattern.source;
      captured = Object.fromEntries(pattern.names.map((name, index) => [name, match[index + 1]]));
      break;
    }
  }
  const text = own(dictionary, key) ? dictionary[key] : source;
  const variables = { ...captured, ...values };
  return text.replace(/\{(\w+)\}/g, (match, name: string) => String(variables[name] ?? match));
}

import { useEffect, useRef } from 'react';
import type { FormInstance } from 'antd';
import { useLanguageStore } from '../stores/languageStore';
import enUS from './locales/en-US';
import zhCN from './locales/zh-CN';

export function useLanguage() {
  return useLanguageStore((state) => state.language);
}

const sources = new Map(Object.entries(enUS).map(([source, english]) => [english, source]));

/** Read the current language at call time, including in async callbacks and API errors. */
export function t(source: string, values: Record<string, string | number> = {}): string {
  const key = sources.get(source) ?? source;
  const dictionary: Record<string, string> = useLanguageStore.getState().language === 'zh-CN' ? zhCN : enUS;
  const text = dictionary[key] ?? source;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match));
}

/** Update existing validation errors without validating, submitting, or resetting inputs. */
export function useFormLanguage(form: Pick<FormInstance, 'getFieldsError' | 'setFields'>) {
  const language = useLanguage();
  const previous = useRef(language);
  useEffect(() => {
    if (previous.current === language) return;
    previous.current = language;
    const errors = form.getFieldsError().filter((field) => field.errors.length);
    if (errors.length) form.setFields(errors.map((field) => ({ ...field, errors: field.errors.map((error) => t(error)) })));
  }, [form, language]);
}

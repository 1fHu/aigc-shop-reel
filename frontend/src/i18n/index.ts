import { ModalTitle } from '../components/LanguageSwitcher';
import { createElement, useEffect, useRef } from 'react';
import type { FormInstance, Modal, ModalFuncProps } from 'antd';
import { useLanguageStore } from '../stores/languageStore';
import { translateText } from './translate';

export function useLanguage() {
  return useLanguageStore((state) => state.language);
}

/** Resolve at call time so async completions use the current interface language. */
export function t(source: string, values: Record<string, string | number> = {}): string {
  return translateText(source, useLanguageStore.getState().language, values);
}

/** Static confirm dialogs need an explicit update when the shared language changes. */
export function confirmLocalized(modal: { confirm: typeof Modal.confirm }, options: ModalFuncProps) {
  let unsubscribe = () => {};
  const localized = () => Object.fromEntries(
    ['title', 'content', 'okText', 'cancelText'].map((key) => {
      const value = options[key as keyof ModalFuncProps];
      const text = typeof value === 'string' ? t(value) : value;
      return [key, key === 'title' ? createElement(ModalTitle, null, text) : text];
    }),
  );
  const instance = modal.confirm({
    ...options,
    ...localized(),
    afterClose: () => { unsubscribe(); options.afterClose?.(); },
  });
  unsubscribe = useLanguageStore.subscribe((state, previous) => {
    if (state.language !== previous.language) instance.update(localized());
  });
  return instance;
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

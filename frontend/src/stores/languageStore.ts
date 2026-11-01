import { create } from 'zustand';

export type Language = 'en-US' | 'zh-CN';
const STORAGE_KEY = 'vidcraft_language';

function initialLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'zh-CN' ? 'zh-CN' : 'en-US';
  } catch {
    return 'en-US';
  }
}

export const useLanguageStore = create<{
  language: Language;
  setLanguage: (language: Language) => void;
}>((set) => ({
  language: initialLanguage(),
  setLanguage(language) {
    try { localStorage.setItem(STORAGE_KEY, language); } catch { /* Storage is optional. */ }
    set({ language });
  },
}));

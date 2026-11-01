import { Button } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { translateText } from '../../i18n/translate';
import { useLanguageStore } from '../../stores/languageStore';
import styles from './LanguageSwitcher.module.css';

export default function LanguageSwitcher({ floating = false }: { floating?: boolean }) {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  return (
    <Button
      type="default"
      className={floating ? styles.floating : styles.switcher}
      icon={<GlobalOutlined />}
      aria-label={translateText('切换语言', language)}
      title={language === 'en-US' ? '切换到中文' : 'Switch to English'}
      onClick={() => setLanguage(language === 'en-US' ? 'zh-CN' : 'en-US')}
    >
      {language === 'en-US' ? '中文' : 'EN'}
    </Button>
  );
}

/** Keep the language control reachable while a dialog's mask blocks the header. */
export function ModalTitle({ children }: { children: ReactNode }) {
  return <div className={styles.modalTitle}><span>{children}</span><LanguageSwitcher /></div>;
}

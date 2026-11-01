import { Button } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { t, useLanguage } from '../../i18n';
import { useLanguageStore } from '../../stores/languageStore';
import styles from './LanguageSwitcher.module.css';

export default function LanguageSwitcher({ floating = false }: { floating?: boolean }) {
  const language = useLanguage();
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  return (
    <Button
      type="default"
      className={floating ? styles.floating : styles.switcher}
      icon={<GlobalOutlined />}
      aria-label={t('切换语言')}
      title={language === 'en-US' ? '切换到中文' : 'Switch to English'}
      onClick={() => setLanguage(language === 'en-US' ? 'zh-CN' : 'en-US')}
    >
      {language === 'en-US' ? '中文' : 'EN'}
    </Button>
  );
}

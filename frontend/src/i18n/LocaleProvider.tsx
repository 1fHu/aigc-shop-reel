import { useEffect, type ReactNode } from 'react';
import { App, ConfigProvider, message, notification } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useLanguage } from './index';
import { theme } from '../theme';

function LanguageEffects() {
  const language = useLanguage();
  const app = App.useApp();
  useEffect(() => {
    document.documentElement.lang = language === 'zh-CN' ? 'zh-CN' : 'en';
    dayjs.locale(language === 'zh-CN' ? 'zh-cn' : 'en');
    app.message.destroy();
    app.notification.destroy();
    message.destroy();
    notification.destroy();
  }, [language, app.message, app.notification]);
  return null;
}

export default function LocaleProvider({ children }: { children: ReactNode }) {
  const language = useLanguage();
  return (
    <ConfigProvider theme={theme} locale={language === 'zh-CN' ? zhCN : enUS}>
      <App><LanguageEffects />{children}</App>
    </ConfigProvider>
  );
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';

import App from './App.tsx';
import { theme } from './theme.ts';
import './index.css';

/**
 * 条件启动 MSW Mock Service Worker
 * 通过 VITE_USE_MOCK=true 开启，后端真接口好了改成 false
 */
async function bootstrap() {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass', // 未 mock 的请求放行
    });
    console.log('%c[MSW] Mock 已启用', 'color: #7C3AED; font-weight: bold');
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ConfigProvider theme={theme} locale={zhCN}>
        <AntdApp>
          <App />
        </AntdApp>
      </ConfigProvider>
    </StrictMode>,
  );
}

bootstrap();

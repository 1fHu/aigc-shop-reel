import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import LocaleProvider from './i18n/LocaleProvider';

import App from './App.tsx';
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
      <LocaleProvider>
        <App />
      </LocaleProvider>
    </StrictMode>,
  );
}

bootstrap();

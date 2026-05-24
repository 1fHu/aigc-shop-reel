import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * MSW browser worker
 * 在 main.tsx 中按 env 开关条件启动
 */
export const worker = setupWorker(...handlers);

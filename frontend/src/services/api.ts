import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';

/**
 * 后端统一返回结构（与 NestJS 接口约定对齐）
 * 后端会在中间件中把所有响应包装成 { code, data, message }
 */
export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message?: string;
  traceId?: string;
}

/**
 * Axios 实例
 * - baseURL 从环境变量读取，默认走 Vite 代理（/api → http://localhost:3000）
 * - 30s 超时（视频生成等长任务不走 axios，走 WebSocket）
 * - withCredentials 携带 cookie（如果后端用 cookie session）
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  withCredentials: true,
});

/**
 * 请求拦截器：注入 JWT
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('vidcraft_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

/**
 * 响应拦截器：
 * - 自动解包 { code, data } 结构，业务代码直接拿 data
 * - code !== 0 视为业务错误，统一 toast
 * - HTTP 错误统一处理（401 跳登录、5xx 提示）
 */
api.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiResponse;

    // 后端 code 约定：0 = 成功，非 0 = 业务错误
    if (payload && typeof payload === 'object' && 'code' in payload) {
      if (payload.code === 0) {
        return payload.data as never;
      }
      message.error(payload.message || '操作失败');
      return Promise.reject(new Error(payload.message || `Business error: ${payload.code}`));
    }

    // 兼容直接返回 data 的接口
    return response.data;
  },
  (error: AxiosError<ApiResponse>) => {
    const status = error.response?.status;
    const traceId = error.response?.data?.traceId;

    if (status === 401) {
      message.error('登录已过期，请重新登录');
      localStorage.removeItem('vidcraft_token');
      // TODO: 跳转到登录页（等登录页实现后接入）
      // window.location.href = '/login';
    } else if (status === 403) {
      message.error('没有权限执行此操作');
    } else if (status === 429) {
      message.warning('请求过于频繁，请稍后再试');
    } else if (status && status >= 500) {
      message.error(
        `服务异常${traceId ? `（traceId: ${traceId}）` : ''}，请稍后重试或联系管理员`,
      );
    } else if (error.code === 'ECONNABORTED') {
      message.error('请求超时');
    } else {
      message.error(error.response?.data?.message || error.message || '网络异常');
    }

    return Promise.reject(error);
  },
);

export default api;

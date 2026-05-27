import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';

/**
 * 后端统一返回结构
 * 与《VidCraft API 接口规范文档 v1.0》0.3 节对齐
 */
export interface ApiResponse<T = unknown> {
  code: number;           // 200 = 成功，其余为业务错误
  msg: string | null;     // 错误消息，成功时为 null
  total: number;          // 列表总数，非列表接口为 0
  data: T;                // 业务数据
  traceId: string;        // 链路追踪 ID
}

/**
 * Axios 实例
 * - baseURL: 走 Vite proxy（/api → http://localhost:3000）
 * - 30s 超时（视频生成长任务走 WebSocket，不在 axios 范围内）
 * - withCredentials 携带 cookie
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
    const token = localStorage.getItem('vidcraft_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

/**
 * 响应拦截器：
 * - code === 200 → 自动解包，业务代码直接拿 data
 * - code !== 200 → 视为业务错误，统一 toast
 * - HTTP 错误（401/403/429/5xx）→ 分情况处理
 *
 * 注意：列表接口的 total 字段会被解包丢弃。如果某个接口确实需要分页 total，
 * 那时再添加 PaginatedData 类型 + 用 rawApi（不带拦截器的实例）专门处理。
 */
api.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiResponse;

    // 文档约定结构
    if (payload && typeof payload === 'object' && 'code' in payload) {
      if (payload.code === 200) {
        return payload.data as never;
      }
      const errMsg = payload.msg || `Business error: ${payload.code}`;
      message.error(errMsg);
      return Promise.reject(new Error(errMsg));
    }

    // 兼容直接返回 data 的接口（防御性，理论上不会进这里）
    return response.data;
  },
  (error: AxiosError<ApiResponse>) => {
    const status = error.response?.status;
    const traceId = error.response?.data?.traceId;
    const serverMsg = error.response?.data?.msg;

    if (status === 401) {
      message.error('登录已过期，请重新登录');
      localStorage.removeItem('vidcraft_access_token');
      localStorage.removeItem('vidcraft_refresh_token');
      // TODO: 跳转到登录页（等登录页实现后接入）
      // window.location.href = '/login';
    } else if (status === 403) {
      message.error(serverMsg || '没有权限执行此操作');
    } else if (status === 404) {
      message.error(serverMsg || '资源不存在');
    } else if (status === 429) {
      message.warning('请求过于频繁，请稍后再试');
    } else if (status === 503) {
      message.error(`下游 AI 服务暂不可用${traceId ? `（traceId: ${traceId}）` : ''}`);
    } else if (status && status >= 500) {
      message.error(
        `服务异常${traceId ? `（traceId: ${traceId}）` : ''}，请稍后重试或联系管理员`,
      );
    } else if (error.code === 'ECONNABORTED') {
      message.error('请求超时');
    } else {
      message.error(serverMsg || error.message || '网络异常');
    }

    return Promise.reject(error);
  },
);

export default api;

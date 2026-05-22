import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  withCredentials: true,
});

// TODO: add request/response interceptors for auth token refresh

export default api;

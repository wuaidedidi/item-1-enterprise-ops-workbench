import axios from 'axios';
import { storage } from '@/utils/storage';
import { showError } from '@/utils/message';

export const http = axios.create({
  baseURL: '/api',
  timeout: 15000
});

http.interceptors.request.use((config) => {
  const token = storage.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (payload?.code !== 200) {
      if (payload?.message) showError(payload.message);
      const error: any = new Error(payload?.message || '请求失败');
      error._isBusinessError = true;
      return Promise.reject(error);
    }
    return payload;
  },
  (error) => {
    if (error?._isBusinessError) return Promise.reject(error);
    const message = error?.response?.data?.message || (error?.response ? (error.response.status >= 500 ? '服务器错误，请稍后重试' : '请求失败') : '网络错误，请检查网络连接');
    if (message) showError(message);
    if (error?.response?.status === 401) {
      storage.token = '';
      storage.user = null;
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export type ApiResponse<T> = { code: number; message: string; data: T };

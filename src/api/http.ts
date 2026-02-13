import axios, { type AxiosError } from 'axios';

export interface OutResp<T> {
  code: number;
  desc: string;
  enDesc?: string;
  data: T;
}

export interface PageResp<T> {
  total: number;
  list: T[];
}

const API_BASE = import.meta.env.VITE_ADMIN_API_BASE ?? '/api-admin';

export const http = axios.create({
  baseURL: API_BASE,
  timeout: 15000
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

http.interceptors.response.use(
  (resp) => {
    const body = resp.data as OutResp<unknown>;
    if (!body || typeof body.code !== 'number') {
      return resp.data;
    }
    if (body.code !== 200) {
      throw new Error(body.desc || body.enDesc || `Request failed: ${body.code}`);
    }
    return body.data;
  },
  (error: AxiosError<{ desc?: string; message?: string }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    const message = error.response?.data?.desc ?? error.response?.data?.message ?? error.message;
    return Promise.reject(new Error(message));
  }
);

import { http } from '../http';

export interface LoginReq {
  username: string;
  password: string;
}

export interface LoginResp {
  id?: number;
  accessToken: string;
  refreshToken: string;
  userId: number;
  userType: number;
  clientId: string;
  expiresTime: number;
}

export interface PermissionUserResp {
  id: number;
  username: string;
  nickname: string;
  deptId?: number;
  email?: string;
  mobile?: string;
  sex?: number;
  avatar?: string;
  loginIp?: string;
  loginDate?: number;
}

export interface PermissionInfoResp {
  user: PermissionUserResp;
  roles: string[];
  permissions: string[];
}

export function login(data: LoginReq) {
  return http.post<LoginReq, LoginResp>('/system/auth/login', data);
}

export function logout() {
  return http.post<never, { success: boolean }>('/system/auth/logout');
}

export function getPermissionInfo() {
  return http.get<never, PermissionInfoResp>('/system/auth/get-permission-info');
}

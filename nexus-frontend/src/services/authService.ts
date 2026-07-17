import { api } from '@/lib/api';
import type { AuthActor } from '@/types';

export interface LoginInput {
  email: string;
  password: string;
  actorType: 'ADMIN' | 'CLIENT';
}

export interface LoginResult {
  token: string;
  actor: AuthActor;
}

export const authService = {
  login: (input: LoginInput) => api.post<LoginResult>('/auth/login', input),
  me: () => api.get<AuthActor>('/auth/me'),
  logout: () => api.post<{ success: boolean }>('/auth/logout'),
  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    api.post<{ success: boolean }>('/auth/change-password', input),
};

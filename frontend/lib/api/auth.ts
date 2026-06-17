import apiClient from './client';

export interface RegisterPayload { email: string; password: string }
export interface LoginPayload { email: string; password: string }
export interface ResetPasswordPayload { token: string; newPassword: string }

export const authApi = {
  register: (data: RegisterPayload) => apiClient.post('/auth/register', data),
  login: (data: LoginPayload) => apiClient.post<{ accessToken: string; refreshToken: string; user: { id: string; email: string; role: string } }>('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
  verifyEmail: (token: string) => apiClient.get(`/auth/verify-email/${token}`),
  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (data: ResetPasswordPayload) => apiClient.post('/auth/reset-password', data),
};

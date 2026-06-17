import apiClient from './client';

export const usersApi = {
  list: (params?: { role?: string; skip?: number; take?: number }) => apiClient.get('/users', { params }),
  getById: (id: string) => apiClient.get(`/users/${id}`),
  update: (id: string, data: { role?: string; isActive?: boolean }) => apiClient.patch(`/users/${id}`, data),
};

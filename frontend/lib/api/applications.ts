import apiClient from './client';

export const applicationsApi = {
  create: (data?: { attestationType?: string }) => apiClient.post('/applications', data),
  list: () => apiClient.get('/applications/me'),
  listAll: (params?: { status?: string; skip?: number; take?: number }) => apiClient.get('/applications', { params }),
  getById: (id: string) => apiClient.get(`/applications/${id}`),
  submit: (id: string) => apiClient.patch(`/applications/${id}/submit`),
  adminComplete: (id: string) => apiClient.patch(`/applications/${id}/complete`),
  adminReject: (id: string, reason: string) => apiClient.patch(`/applications/${id}/reject`, { reason }),
  // Degree details
  upsertDegreeDetail: (id: string, data: object) => apiClient.put(`/applications/${id}/degree-detail`, data),
  getDegreeDetail: (id: string) => apiClient.get(`/applications/${id}/degree-detail`),
  // Attestation details
  upsertAttestationDetail: (id: string, data: object) => apiClient.put(`/applications/${id}/attestation-detail`, data),
  getAttestationDetail: (id: string) => apiClient.get(`/applications/${id}/attestation-detail`),
};

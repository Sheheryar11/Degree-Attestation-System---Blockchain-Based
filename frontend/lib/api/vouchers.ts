import apiClient from './client';

export const vouchersApi = {
  generate: (applicationId: string) => apiClient.post(`/applications/${applicationId}/voucher/generate`),
  getByApplication: (applicationId: string) => apiClient.get(`/applications/${applicationId}/voucher`),
};

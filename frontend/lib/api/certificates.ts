import apiClient from './client';

export const certificatesApi = {
  mine: () => apiClient.get('/certificates/mine'),
  byApplication: (applicationId: string) => apiClient.get(`/certificates/application/${applicationId}`),
};

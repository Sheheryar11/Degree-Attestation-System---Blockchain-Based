import apiClient from './client';

export const blockchainApi = {
  listAll: () => apiClient.get('/blockchain/records'),
};

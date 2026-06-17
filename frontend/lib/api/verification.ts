import apiClient from './client';

export const verificationApi = {
  byDegreeId: (degreeId: string) => apiClient.get('/verify/degree', { params: { degreeId } }),
  byCnic: (cnic: string) => apiClient.get('/verify/cnic', { params: { cnic } }),
  byQr: (token: string) => apiClient.get('/verify/qr', { params: { token } }),
};

import apiClient from './client';

export type PaymentMethodOption = 'BANK_CHALLAN' | 'EASYPAISA' | 'JAZZCASH' | 'CARD' | 'BLOCKCHAIN';

export const paymentsApi = {
  submit: (applicationId: string, data: { transactionId: string; bankName?: string; paymentDate: string; amount: number; method?: PaymentMethodOption }) =>
    apiClient.post(`/applications/${applicationId}/payments`, data),
  verify: (applicationId: string, paymentId: string, data: { approved: boolean; notes?: string }) =>
    apiClient.patch(`/applications/${applicationId}/payments/${paymentId}/verify`, data),
  getByApplication: (applicationId: string) => apiClient.get(`/applications/${applicationId}/payments`),
};

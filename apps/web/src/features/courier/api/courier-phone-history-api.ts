import type { CourierPhoneHistory } from '@laam/types';

import { apiRequest } from '@/lib/api/client';

export const courierPhoneHistoryApi = {
  async check(phone: string, refresh = false): Promise<CourierPhoneHistory> {
    const params = new URLSearchParams({ phone });
    if (refresh) params.set('refresh', '1');
    return apiRequest<CourierPhoneHistory>(`/crm/courier-history?${params.toString()}`);
  },

  async refresh(phone: string): Promise<CourierPhoneHistory> {
    return apiRequest<CourierPhoneHistory>(
      `/crm/courier-history/refresh?phone=${encodeURIComponent(phone)}`,
      { method: 'POST' },
    );
  },
};

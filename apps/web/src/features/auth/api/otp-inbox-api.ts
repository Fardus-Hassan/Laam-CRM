import { otpInboxItemSchema, type OtpInboxItem } from '@laam/types';
import { z } from 'zod';

import { apiRequest } from '@/lib/api/client';
import { authEndpoints } from '@/lib/api/endpoints';

const otpInboxSchema = z.array(otpInboxItemSchema);

export const otpInboxApi = {
  async list(): Promise<OtpInboxItem[]> {
    const data = await apiRequest<unknown>(authEndpoints.otpInbox);
    return otpInboxSchema.parse(data);
  },
};

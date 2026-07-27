import type {
  SendBulkOrderSmsPayload,
  SendOrderSmsPayload,
  SendSmsResult,
  SendSmsTestPayload,
  SmsIntegrationSettings,
  SmsTemplate,
  UpsertSmsIntegrationPayload,
  UpsertSmsTemplatePayload,
} from '@laam/types';

import { apiRequest } from '@/lib/api/client';

export const smsSettingsApi = {
  get(): Promise<SmsIntegrationSettings> {
    return apiRequest<SmsIntegrationSettings>('/crm/settings/sms');
  },

  save(payload: UpsertSmsIntegrationPayload): Promise<SmsIntegrationSettings> {
    return apiRequest<SmsIntegrationSettings>('/crm/settings/sms', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  saveAutomation(payload: {
    autoSmsOnStatusChange?: boolean;
    statusSmsMap?: Record<string, string>;
  }): Promise<SmsIntegrationSettings> {
    return apiRequest<SmsIntegrationSettings>('/crm/settings/sms/automation', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  disconnect(): Promise<SmsIntegrationSettings> {
    return apiRequest<SmsIntegrationSettings>('/crm/settings/sms', {
      method: 'DELETE',
    });
  },

  test(payload: SendSmsTestPayload): Promise<SendSmsResult> {
    return apiRequest<SendSmsResult>('/crm/settings/sms/test', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listTemplates(): Promise<SmsTemplate[]> {
    return apiRequest<SmsTemplate[]>('/crm/settings/sms/templates');
  },

  upsertTemplate(payload: UpsertSmsTemplatePayload): Promise<SmsTemplate> {
    return apiRequest<SmsTemplate>('/crm/settings/sms/templates', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

export const orderSmsApi = {
  send(orderId: string, payload: SendOrderSmsPayload): Promise<SendSmsResult> {
    return apiRequest<SendSmsResult>(`/crm/orders/${encodeURIComponent(orderId)}/sms`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  bulk(payload: SendBulkOrderSmsPayload): Promise<{
    successCount: number;
    failedCount: number;
    message: string;
  }> {
    return apiRequest('/crm/orders/bulk/sms', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

import { z } from 'zod';

import {
  ACTIVE_COURIER_PROVIDERS,
  COURIER_PROVIDER_META,
  activeCourierProviderSchema,
  isActiveCourierProvider,
  listActiveCourierProviders,
  type ActiveCourierProvider,
  type CourierProviderMeta,
} from './courier-providers.js';

/** Includes legacy providers for stored data; UI should use ACTIVE_COURIER_PROVIDERS. */
export const courierProviderSchema = z.enum([
  'pathao',
  'carrybee',
  'steadfast',
  'redx',
  'paperfly',
  'ecourier',
]);
export type CourierProvider = z.infer<typeof courierProviderSchema>;

export {
  ACTIVE_COURIER_PROVIDERS,
  COURIER_PROVIDER_META,
  activeCourierProviderSchema,
  isActiveCourierProvider,
  listActiveCourierProviders,
  type ActiveCourierProvider,
  type CourierProviderMeta,
};

export const courierAccountStatusSchema = z.enum(['active', 'inactive', 'error']);
export type CourierAccountStatus = z.infer<typeof courierAccountStatusSchema>;

export const courierAccountSchema = z.object({
  id: z.string(),
  provider: courierProviderSchema,
  label: z.string(),
  status: courierAccountStatusSchema,
  isDefault: z.boolean(),
  apiKeyMasked: z.string().optional(),
  lastSyncAt: z.string().optional(),
  consignmentsToday: z.number(),
  successRate: z.number(),
});
export type CourierAccount = z.infer<typeof courierAccountSchema>;

export const courierEventTypeSchema = z.enum([
  'submitted',
  'picked',
  'in_transit',
  'delivered',
  'returned',
  'cod_collected',
  'failed',
]);
export type CourierEventType = z.infer<typeof courierEventTypeSchema>;

export const courierInboxEventSchema = z.object({
  id: z.string(),
  type: courierEventTypeSchema,
  orderId: z.string(),
  orderNumber: z.string(),
  consignmentId: z.string(),
  provider: courierProviderSchema,
  customerName: z.string(),
  message: z.string(),
  createdAt: z.string(),
  isRead: z.boolean(),
});
export type CourierInboxEvent = z.infer<typeof courierInboxEventSchema>;

export const courierSubmitItemSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  customerName: z.string(),
  district: z.string(),
  amountBdt: z.number(),
  status: z.enum(['ready', 'submitted', 'failed']),
});
export type CourierSubmitItem = z.infer<typeof courierSubmitItemSchema>;

export const courierRulesSchema = z.object({
  defaultProvider: courierProviderSchema,
  codEnabled: z.boolean(),
  codChargePercent: z.number(),
  autoSubmitOnConfirm: z.boolean(),
});
export type CourierRules = z.infer<typeof courierRulesSchema>;

export const courierOverviewSchema = z.object({
  accounts: z.array(courierAccountSchema),
  rules: courierRulesSchema,
  inbox: z.array(courierInboxEventSchema),
  /** @deprecated Prefer GET /crm/courier/ready (paginated). May be empty. */
  readyToSubmit: z.array(courierSubmitItemSchema),
  stats: z.object({
    submittedToday: z.number(),
    inTransit: z.number(),
    deliveredToday: z.number(),
    failedToday: z.number(),
    /** Total orders in the ready-to-submit queue. */
    readyCount: z.number().optional(),
  }),
});
export type CourierOverview = z.infer<typeof courierOverviewSchema>;

export const courierReadyListQuerySchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  search: z.string().optional(),
});
export type CourierReadyListQuery = z.infer<typeof courierReadyListQuerySchema>;

export const courierReadyListResponseSchema = z.object({
  items: z.array(courierSubmitItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type CourierReadyListResponse = z.infer<typeof courierReadyListResponseSchema>;

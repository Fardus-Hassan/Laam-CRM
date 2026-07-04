import { z } from 'zod';

export const courierProviderSchema = z.enum([
  'steadfast',
  'pathao',
  'redx',
  'paperfly',
  'ecourier',
  'carrybee',
]);
export type CourierProvider = z.infer<typeof courierProviderSchema>;

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
  readyToSubmit: z.array(courierSubmitItemSchema),
  stats: z.object({
    submittedToday: z.number(),
    inTransit: z.number(),
    deliveredToday: z.number(),
    failedToday: z.number(),
  }),
});
export type CourierOverview = z.infer<typeof courierOverviewSchema>;

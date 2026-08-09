import { z } from 'zod';
import { tenantPlanSchema } from './tenant.js';

export const invoiceStatusSchema = z.enum(['paid', 'pending', 'overdue', 'cancelled']);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const billingSubscriptionSchema = z.object({
  plan: tenantPlanSchema,
  status: z.enum(['active', 'trial', 'past_due', 'cancelled']),
  billingCycle: z.enum(['monthly', 'yearly']),
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  nextBillingDate: z.string(),
  amountBdt: z.number(),
  smsCredits: z.number(),
  smsCreditsUsed: z.number(),
  orderQuota: z.number(),
  ordersUsed: z.number(),
  userSeats: z.number(),
  usersActive: z.number(),
  autoRenew: z.boolean(),
});

export type BillingSubscription = z.infer<typeof billingSubscriptionSchema>;

export const billingInvoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  date: z.string(),
  dueDate: z.string(),
  amountBdt: z.number(),
  status: invoiceStatusSchema,
  plan: tenantPlanSchema,
  periodLabel: z.string(),
  pdfUrl: z.string().optional(),
});

export type BillingInvoice = z.infer<typeof billingInvoiceSchema>;

export const billingPaymentMethodSchema = z.object({
  id: z.string(),
  type: z.enum(['bkash', 'nagad', 'bank', 'card']),
  label: z.string(),
  lastFour: z.string().optional(),
  isDefault: z.boolean(),
});

export type BillingPaymentMethod = z.infer<typeof billingPaymentMethodSchema>;

export const billingOverviewSchema = z.object({
  subscription: billingSubscriptionSchema,
  paymentMethods: z.array(billingPaymentMethodSchema),
  recentInvoices: z.array(billingInvoiceSchema),
  totalPaidBdt: z.number(),
  outstandingBdt: z.number(),
});

export type BillingOverview = z.infer<typeof billingOverviewSchema>;

export const rechargeCreditsPayloadSchema = z.object({
  amountBdt: z.number().min(100),
  /** Optional recorded payment method id (manual label — no gateway charge). */
  paymentMethodId: z.string().optional(),
  note: z.string().optional(),
});

export type RechargeCreditsPayload = z.infer<typeof rechargeCreditsPayloadSchema>;

export const createBillingInvoicePayloadSchema = z.object({
  amountBdt: z.number().positive(),
  plan: tenantPlanSchema.optional(),
  periodLabel: z.string().min(1),
  date: z.string().optional(),
  dueDate: z.string().optional(),
  status: invoiceStatusSchema.optional(),
});
export type CreateBillingInvoicePayload = z.infer<typeof createBillingInvoicePayloadSchema>;

export const upsertBillingPaymentMethodPayloadSchema = z.object({
  type: z.enum(['bkash', 'nagad', 'bank', 'card']),
  label: z.string().min(1),
  lastFour: z.string().optional(),
  isDefault: z.boolean().optional(),
});
export type UpsertBillingPaymentMethodPayload = z.infer<
  typeof upsertBillingPaymentMethodPayloadSchema
>;

export const billingPlanOptionSchema = z.object({
  id: z.string(),
  name: tenantPlanSchema,
  monthlyBdt: z.number(),
  yearlyBdt: z.number(),
  smsCredits: z.number(),
  orderQuota: z.number(),
  userSeats: z.number(),
  features: z.array(z.string()),
  isPopular: z.boolean().optional(),
});

export type BillingPlanOption = z.infer<typeof billingPlanOptionSchema>;

export const platformBillingTenantSchema = z.object({
  tenantId: z.string(),
  tenantName: z.string(),
  plan: tenantPlanSchema,
  status: z.enum(['active', 'past_due', 'suspended']),
  mrrBdt: z.number(),
  lastPaymentDate: z.string().optional(),
  outstandingBdt: z.number(),
});

export type PlatformBillingTenant = z.infer<typeof platformBillingTenantSchema>;

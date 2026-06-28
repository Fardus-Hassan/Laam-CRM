import { z } from 'zod';
import { orderStatusTypeSchema } from './dashboard.js';

export { orderStatusTypeSchema, type OrderStatusType } from './dashboard.js';

export const orderSourceSchema = z.enum([
  'facebook',
  'call',
  'ecommerce',
  'walk_in',
]);

export type OrderSource = z.infer<typeof orderSourceSchema>;

export const paymentStatusSchema = z.enum(['cod', 'paid', 'partial', 'refunded']);

export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const orderListItemSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: orderStatusTypeSchema,
  customerName: z.string(),
  customerPhone: z.string(),
  source: orderSourceSchema,
  itemsCount: z.number().int().nonnegative(),
  amount: z.number(),
  paymentStatus: paymentStatusSchema,
  assignedAgentName: z.string().optional(),
  shippingArea: z.string(),
  createdAt: z.string(),
});

export type OrderListItem = z.infer<typeof orderListItemSchema>;

export const orderLineItemSchema = z.object({
  id: z.string(),
  productName: z.string(),
  sku: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number(),
  lineTotal: z.number(),
});

export type OrderLineItem = z.infer<typeof orderLineItemSchema>;

export const orderTimelineEventSchema = z.object({
  id: z.string(),
  type: z.enum(['created', 'confirmed', 'hold', 'cancelled', 'delivered', 'note', 'assigned']),
  label: z.string(),
  description: z.string().optional(),
  timestamp: z.string(),
  actorName: z.string().optional(),
});

export type OrderTimelineEvent = z.infer<typeof orderTimelineEventSchema>;

export const orderDetailSchema = orderListItemSchema.extend({
  customerEmail: z.string().email().optional(),
  shippingAddress: z.string(),
  deliveryCharge: z.number(),
  discount: z.number().default(0),
  subtotal: z.number(),
  lineItems: z.array(orderLineItemSchema),
  timeline: z.array(orderTimelineEventSchema),
  notes: z.string().optional(),
  leadId: z.string().optional(),
  confirmedAt: z.string().optional(),
  deliveredAt: z.string().optional(),
});

export type OrderDetail = z.infer<typeof orderDetailSchema>;

export const orderListQuerySchema = z.object({
  status: orderStatusTypeSchema.optional(),
  search: z.string().optional(),
  source: orderSourceSchema.optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(20),
});

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

export const orderListSummarySchema = z.object({
  count: z.number(),
  totalAmount: z.number(),
});

export type OrderListSummary = z.infer<typeof orderListSummarySchema>;

export const orderListResponseSchema = z.object({
  items: z.array(orderListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  summary: orderListSummarySchema,
});

export type OrderListResponse = z.infer<typeof orderListResponseSchema>;

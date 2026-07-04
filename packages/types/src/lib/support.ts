import { z } from 'zod';

export const ticketStatusSchema = z.enum(['open', 'pending', 'resolved', 'closed']);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const ticketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;

export const ticketMessageSchema = z.object({
  id: z.string(),
  authorName: z.string(),
  authorRole: z.enum(['agent', 'customer', 'system']),
  body: z.string(),
  createdAt: z.string(),
});
export type TicketMessage = z.infer<typeof ticketMessageSchema>;

export const supportTicketSchema = z.object({
  id: z.string(),
  subject: z.string(),
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  customerName: z.string(),
  customerMobile: z.string(),
  orderId: z.string().optional(),
  orderNumber: z.string().optional(),
  assigneeName: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(ticketMessageSchema),
});
export type SupportTicket = z.infer<typeof supportTicketSchema>;

export const createTicketPayloadSchema = z.object({
  subject: z.string().min(3),
  body: z.string().min(3),
  priority: ticketPrioritySchema,
  customerName: z.string(),
  customerMobile: z.string(),
  orderNumber: z.string().optional(),
});
export type CreateTicketPayload = z.infer<typeof createTicketPayloadSchema>;

export const ticketListQuerySchema = z.object({
  status: ticketStatusSchema.optional(),
  search: z.string().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;

export const ticketListResponseSchema = z.object({
  items: z.array(supportTicketSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  summary: z.object({
    open: z.number(),
    pending: z.number(),
    resolved: z.number(),
    urgent: z.number(),
  }),
});
export type TicketListResponse = z.infer<typeof ticketListResponseSchema>;

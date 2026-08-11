import { z } from 'zod';

export const blockTypeSchema = z.enum(['ip', 'mobile']);
export type BlockType = z.infer<typeof blockTypeSchema>;

export const blockReasonSchema = z.enum(['fraud', 'duplicate', 'abuse', 'chargeback', 'manual', 'other']);
export type BlockReason = z.infer<typeof blockReasonSchema>;

export const blockedEntrySchema = z.object({
  id: z.string(),
  type: blockTypeSchema,
  value: z.string(),
  reason: blockReasonSchema,
  note: z.string().optional(),
  blockedBy: z.string(),
  blockedByName: z.string(),
  createdAt: z.string(),
  expiresAt: z.string().optional(),
  orderCount: z.number().optional(),
  lastOrderId: z.string().optional(),
});

export type BlockedEntry = z.infer<typeof blockedEntrySchema>;

export const createBlockedEntryPayloadSchema = z.object({
  type: blockTypeSchema,
  value: z.string().min(3),
  reason: blockReasonSchema,
  note: z.string().optional(),
  expiresInDays: z.number().min(1).max(365).optional(),
  /** Optional CRM order id that triggered this block (order detail “Block” action). */
  lastOrderId: z.string().optional(),
});

export type CreateBlockedEntryPayload = z.infer<typeof createBlockedEntryPayloadSchema>;

export const blockedListQuerySchema = z.object({
  type: blockTypeSchema.optional(),
  search: z.string().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

export type BlockedListQuery = z.infer<typeof blockedListQuerySchema>;

export const blockedListSummarySchema = z.object({
  total: z.number(),
  ipCount: z.number(),
  mobileCount: z.number(),
  expiringSoon: z.number(),
});

export type BlockedListSummary = z.infer<typeof blockedListSummarySchema>;

export const blockedListResponseSchema = z.object({
  items: z.array(blockedEntrySchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  summary: blockedListSummarySchema,
});

export type BlockedListResponse = z.infer<typeof blockedListResponseSchema>;

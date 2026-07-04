import { z } from 'zod';

export const knowledgeChannelSchema = z.enum(['whatsapp', 'messenger', 'all']);
export type KnowledgeChannel = z.infer<typeof knowledgeChannelSchema>;

export const knowledgeArticleStatusSchema = z.enum(['active', 'draft', 'archived']);
export type KnowledgeArticleStatus = z.infer<typeof knowledgeArticleStatusSchema>;

export const knowledgeArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  keywords: z.array(z.string()),
  channels: z.array(knowledgeChannelSchema),
  category: z.string(),
  status: knowledgeArticleStatusSchema,
  updatedAt: z.string(),
  createdAt: z.string(),
});

export type KnowledgeArticle = z.infer<typeof knowledgeArticleSchema>;

export const createKnowledgeArticlePayloadSchema = z.object({
  title: z.string().min(2),
  body: z.string().min(2),
  keywords: z.array(z.string()).default([]),
  channels: z.array(knowledgeChannelSchema).default(['all']),
  category: z.string().default('general'),
  status: knowledgeArticleStatusSchema.default('active'),
});

export type CreateKnowledgeArticlePayload = z.infer<typeof createKnowledgeArticlePayloadSchema>;

export const knowledgeSearchQuerySchema = z.object({
  channel: knowledgeChannelSchema.optional(),
  q: z.string().optional(),
  status: knowledgeArticleStatusSchema.optional(),
});

export type KnowledgeSearchQuery = z.infer<typeof knowledgeSearchQuerySchema>;

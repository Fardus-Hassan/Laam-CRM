import { z } from 'zod';

export const followupAutomationRuleSchema = z.object({
  queue: z.number().int().min(1).max(3).default(1),
  delayDays: z.number().int().min(0).max(90).default(0),
  note: z.string().optional(),
});
export type FollowupAutomationRule = z.infer<typeof followupAutomationRuleSchema>;

export const automationSettingsSchema = z.object({
  autoSmsOnStatusChange: z.boolean(),
  /** status slug → template slug */
  statusSmsMap: z.record(z.string(), z.string()),
  autoFollowupOnStatusChange: z.boolean(),
  /** status slug → follow-up rule */
  statusFollowupMap: z.record(z.string(), followupAutomationRuleSchema),
  smsEnabled: z.boolean(),
  updatedAt: z.string(),
});
export type AutomationSettings = z.infer<typeof automationSettingsSchema>;

export const upsertAutomationSettingsPayloadSchema = z.object({
  autoSmsOnStatusChange: z.boolean().optional(),
  statusSmsMap: z.record(z.string(), z.string()).optional(),
  autoFollowupOnStatusChange: z.boolean().optional(),
  statusFollowupMap: z.record(z.string(), followupAutomationRuleSchema).optional(),
});
export type UpsertAutomationSettingsPayload = z.infer<
  typeof upsertAutomationSettingsPayloadSchema
>;

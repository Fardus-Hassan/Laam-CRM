import { z } from 'zod';

export const orderStatusDisplayModeSchema = z.enum([
  'sidebar',
  'nested_tab',
  'filter_only',
  'sidebar_and_tab',
]);

export type OrderStatusDisplayMode = z.infer<typeof orderStatusDisplayModeSchema>;

export const orderWorkflowGroupSchema = z.enum([
  'intake',
  'confirm',
  'fulfillment',
  'delivery',
  'returns',
  'terminal',
  'special',
]);

export type OrderWorkflowGroup = z.infer<typeof orderWorkflowGroupSchema>;

export const bulkActionIdSchema = z.enum([
  'print_selected',
  'print_barcode',
  'print_info',
  'print_info_2',
  'export',
  'submit_pathao',
  'submit_steadfast',
  'submit_carrybee',
  'update_courier_status',
  'send_sms',
  'set_followup',
  'transfer',
  'courier_unlink',
  'status_change',
]);

export type BulkActionId = z.infer<typeof bulkActionIdSchema>;

export const orderPageKindSchema = z.enum(['form', 'list', 'failed', 'tool', 'payments']);

export type OrderPageKind = z.infer<typeof orderPageKindSchema>;

export const orderStatusConfigSchema = z.object({
  id: z.string(),
  /** Org-defined slug (not limited to built-in enum). */
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase letters, numbers, underscores'),
  label: z.string(),
  labelBn: z.string().optional(),
  color: z.string(),
  group: orderWorkflowGroupSchema,
  /** Parent queue folder (e.g. pendings) OR another status slug. */
  parentSlug: z.string().optional(),
  displayMode: orderStatusDisplayModeSchema,
  /** Explicit override — when set, wins over displayMode for sidebar link visibility. */
  showInSidebar: z.boolean().optional(),
  /** Explicit override — when set, wins over displayMode for in-page tab visibility. */
  showInNestedTabs: z.boolean().optional(),
  sidebarOrder: z.number().optional(),
  isTerminal: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  allowedTransitions: z.array(z.string()).default([]),
  bulkActions: z.array(bulkActionIdSchema).default([]),
  showInGroupByStatus: z.boolean().default(true),
});

export type OrderStatusConfig = z.infer<typeof orderStatusConfigSchema>;

export const orderQueuePageSchema = z.object({
  slug: z.string(),
  label: z.string(),
  href: z.string(),
  kind: orderPageKindSchema,
  displayMode: orderStatusDisplayModeSchema,
  sidebarOrder: z.number(),
  childStatusSlugs: z.array(z.string()).optional(),
  defaultChildSlug: z.string().optional(),
  title: z.string(),
  description: z.string(),
  showInNav: z.boolean().default(true),
});

export type OrderQueuePage = z.infer<typeof orderQueuePageSchema>;

export const orderStatusCountSchema = z.object({
  slug: z.string().min(1),
  count: z.number().int().nonnegative(),
  unitCount: z.number().int().nonnegative().optional(),
});

export type OrderStatusCount = z.infer<typeof orderStatusCountSchema>;

export const orderNavStatusCountsSchema = z.object({
  byStatus: z.record(z.string(), z.number().int().nonnegative()),
  followupsDue: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative().default(0),
});

export type OrderNavStatusCounts = z.infer<typeof orderNavStatusCountsSchema>;

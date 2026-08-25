import { z } from 'zod';

import { customerCompareOpSchema } from './customers.js';
import { orderStatusDisplayModeSchema } from './order-status-config.js';

/** Same visibility modes as order statuses. */
export const customerPurchaseDisplayModeSchema = orderStatusDisplayModeSchema;
export type CustomerPurchaseDisplayMode = z.infer<
  typeof customerPurchaseDisplayModeSchema
>;

/** Which denormalized counter drives the purchase segment. */
export const customerPurchaseMetricSchema = z.enum([
  'deliveredCount',
  'orderCount',
]);
export type CustomerPurchaseMetric = z.infer<typeof customerPurchaseMetricSchema>;

export const orgCustomerPurchaseSegmentSchema = z.object({
  id: z.string(),
  organizationId: z.string().optional(),
  slug: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  /** Compare operator against metric (eq = exact Nx buyers; gt = Loyal). */
  op: customerCompareOpSchema,
  threshold: z.number().int().nonnegative(),
  metric: customerPurchaseMetricSchema.default('deliveredCount'),
  displayMode: customerPurchaseDisplayModeSchema.default('sidebar_and_tab'),
  sortOrder: z.number().int().default(0),
  /** Derived from displayMode for nav helpers / legacy. */
  showInNav: z.boolean().default(true),
  isActive: z.boolean().default(true),
  isSystem: z.boolean().default(false),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type OrgCustomerPurchaseSegment = z.infer<
  typeof orgCustomerPurchaseSegmentSchema
>;

export const upsertOrgCustomerPurchaseSegmentPayloadSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1).max(64).optional(),
  label: z.string().min(1).max(120),
  op: customerCompareOpSchema.default('eq'),
  threshold: z.number().int().nonnegative(),
  metric: customerPurchaseMetricSchema.optional(),
  displayMode: customerPurchaseDisplayModeSchema.optional(),
  sortOrder: z.number().int().optional(),
  showInNav: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type UpsertOrgCustomerPurchaseSegmentPayload = z.infer<
  typeof upsertOrgCustomerPurchaseSegmentPayloadSchema
>;

export function purchaseSegmentShowsInSidebar(
  segment: Pick<OrgCustomerPurchaseSegment, 'displayMode' | 'showInNav'>,
): boolean {
  if (segment.displayMode === 'sidebar' || segment.displayMode === 'sidebar_and_tab') {
    return true;
  }
  if (segment.displayMode === 'nested_tab' || segment.displayMode === 'filter_only') {
    return false;
  }
  return segment.showInNav;
}

export function purchaseSegmentShowsInNestedTabs(
  segment: Pick<OrgCustomerPurchaseSegment, 'displayMode'>,
): boolean {
  return (
    segment.displayMode === 'nested_tab' ||
    segment.displayMode === 'sidebar_and_tab'
  );
}

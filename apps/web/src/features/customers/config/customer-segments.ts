import type { CustomerSegmentCount } from '@laam/types';

/** Fallback labels for legacy status slugs. */
export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  none: 'No status',
  '2_time': '2× Purchase',
  '3_time': '3× Purchase',
  '5_time': '5× Purchase',
  '10_time': '10× Purchase',
  premium: 'Premium',
  repeat: 'Repeat buyer',
  ramadan: 'Ramadan buyer',
};

export function customerStatusLabel(status: string, override?: string) {
  return override || CUSTOMER_STATUS_LABELS[status] || status;
}

export type CustomerSegmentCounts = CustomerSegmentCount[];

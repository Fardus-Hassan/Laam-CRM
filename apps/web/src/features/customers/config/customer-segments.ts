import type { CustomerSegmentCount, CustomerStatus } from '@laam/types';

export type CustomerSegmentDefinition = {
  id: string;
  label: string;
  minOrders?: number;
  maxOrders?: number;
  tag?: string;
  status?: CustomerStatus;
};

export const CUSTOMER_SEGMENTS: CustomerSegmentDefinition[] = [
  { id: 'all', label: 'All' },
  { id: '2_time', label: '2× Purchase', minOrders: 2, maxOrders: 2 },
  { id: '3_time', label: '3× Purchase', minOrders: 3, maxOrders: 3 },
  { id: '5_time', label: '5× Purchase', minOrders: 5, maxOrders: 5 },
  { id: '10_time', label: '10× Purchase', minOrders: 10 },
  { id: 'premium', label: 'Premium', status: 'premium' },
  { id: 'repeat', label: 'Repeat buyer', status: 'repeat' },
  { id: 'ramadan', label: 'Ramadan', tag: 'Ramadan' },
  { id: 'no_status', label: 'No status', status: 'none' },
  { id: 'has_followup', label: 'Follow-up due' },
];

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  none: 'No status',
  '2_time': '2× Purchase',
  '3_time': '3× Purchase',
  '5_time': '5× Purchase',
  '10_time': '10× Purchase',
  premium: 'Premium customer',
  repeat: 'Repeat buyer',
  ramadan: 'Ramadan buyer',
};

export type CustomerSegmentCounts = CustomerSegmentCount[];

import type { BlockReason, BlockType } from '@laam/types';

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  ip: 'IP Address',
  mobile: 'Mobile Number',
};

export const BLOCK_REASON_LABELS: Record<BlockReason, string> = {
  fraud: 'Fraud',
  duplicate: 'Duplicate orders',
  abuse: 'Abuse / spam',
  chargeback: 'Chargeback',
  manual: 'Manual block',
  other: 'Other',
};

export const BLOCK_REASON_OPTIONS = Object.entries(BLOCK_REASON_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const BLOCK_TYPE_OPTIONS = Object.entries(BLOCK_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

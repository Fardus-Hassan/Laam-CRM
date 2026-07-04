import type { FollowupFilter } from '@laam/types';

export type FollowupFilterDefinition = {
  id: FollowupFilter;
  label: string;
};

export const FOLLOWUP_FILTERS: FollowupFilterDefinition[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: "Today's follow-up" },
  { id: 'no_status', label: 'No status' },
];

export const FOLLOWUP_STATUS_LABELS: Record<
  import('@laam/types').FollowupStatus,
  string
> = {
  no_status: 'No status',
  pending: 'Pending',
  done: 'Done',
  converted: 'Converted',
};

export const FOLLOWUP_TYPE_LABELS: Record<import('@laam/types').FollowupType, string> = {
  listed: 'Listed',
  repeat: 'Repeat',
  vip: 'VIP',
};

export const FOLLOWUP_SMS_LABELS: Record<import('@laam/types').FollowupSmsStatus, string> = {
  not_sent: 'Not sent',
  sent: 'Sent',
};

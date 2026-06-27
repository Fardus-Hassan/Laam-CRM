import type { FollowUpRow, OrderStatusType } from '@laam/types';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const ORDER_STATUS_CONFIG: Record<
  OrderStatusType,
  { label: string; variant: 'success' | 'default' | 'danger' | 'warning' | 'secondary' }
> = {
  confirmed: { label: 'Confirmed', variant: 'success' },
  delivered: { label: 'Delivered', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
  hold: { label: 'Hold', variant: 'warning' },
  follow_up: { label: 'Follow Up', variant: 'secondary' },
  pending: { label: 'Pending', variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'default' },
};

const FOLLOW_UP_STATUS_CONFIG: Record<
  FollowUpRow['status'],
  { label: string; variant: 'success' | 'default' | 'danger' | 'warning' | 'secondary' }
> = {
  pending: { label: 'Pending', variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'success' },
};

type StatusBadgeProps = {
  status: OrderStatusType | FollowUpRow['status'];
  kind?: 'order' | 'follow_up';
  className?: string;
};

export function StatusBadge({ status, kind = 'order', className }: StatusBadgeProps) {
  const config =
    kind === 'follow_up'
      ? FOLLOW_UP_STATUS_CONFIG[status as FollowUpRow['status']]
      : ORDER_STATUS_CONFIG[status as OrderStatusType];

  return (
    <Badge variant={config.variant} className={cn('font-normal', className)}>
      {config.label}
    </Badge>
  );
}

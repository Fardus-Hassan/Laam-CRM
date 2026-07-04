'use client';

import type { CustomerStatus } from '@laam/types';

import { Badge } from '@/components/ui/badge';
import { CUSTOMER_STATUS_LABELS } from '@/features/customers/config/customer-segments';
import { cn } from '@/lib/utils';

const VARIANT: Record<CustomerStatus, string> = {
  none: 'bg-muted text-muted-foreground',
  '2_time': 'bg-blue-500/15 text-blue-700',
  '3_time': 'bg-blue-500/15 text-blue-700',
  '5_time': 'bg-violet-500/15 text-violet-700',
  '10_time': 'bg-violet-500/15 text-violet-700',
  premium: 'bg-amber-500/15 text-amber-700',
  repeat: 'bg-emerald-500/15 text-emerald-700',
  ramadan: 'bg-orange-500/15 text-orange-700',
};

export function CustomerStatusBadge({
  status,
  className,
}: {
  status: CustomerStatus;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn('font-normal', VARIANT[status], className)}>
      {CUSTOMER_STATUS_LABELS[status]}
    </Badge>
  );
}

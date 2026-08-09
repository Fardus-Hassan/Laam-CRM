'use client';

import type { CustomerStatus } from '@laam/types';

import { Badge } from '@/components/ui/badge';
import { customerStatusLabel } from '@/features/customers/config/customer-segments';
import { cn } from '@/lib/utils';

export function CustomerStatusBadge({
  status,
  label,
  className,
}: {
  status: CustomerStatus;
  label?: string;
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-normal',
        status === 'premium' && 'bg-amber-500/15 text-amber-700',
        status === 'none' && 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {customerStatusLabel(status, label)}
    </Badge>
  );
}

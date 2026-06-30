import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function DataTableDateTime({
  prefix,
  value,
  formatter,
  className,
}: {
  prefix?: string;
  value: string;
  formatter: (value: string) => string;
  className?: string;
}) {
  return (
    <p className={cn('text-xs tabular-nums', className)}>
      {prefix ? <span className="font-medium text-muted-foreground">{prefix}</span> : null}
      {prefix ? ' ' : null}
      <span className="whitespace-nowrap">{formatter(value)}</span>
    </p>
  );
}

export function DataTablePersonCell({
  name,
  phone,
  sourceLabel,
  phoneSlot,
  className,
}: {
  name: string;
  phone?: string;
  sourceLabel?: string;
  phoneSlot?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <p className="text-sm font-medium leading-snug">{name}</p>
      {phoneSlot ?? (phone ? <p className="text-xs text-muted-foreground">{phone}</p> : null)}
      {sourceLabel ? (
        <Badge variant="secondary" className="text-[10px] font-normal">
          {sourceLabel}
        </Badge>
      ) : null}
    </div>
  );
}

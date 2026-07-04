import * as React from 'react';

import { cn } from '@/lib/utils';

function Progress({
  className,
  value,
  indicatorClassName,
  ...props
}: React.ComponentProps<'div'> & {
  value?: number;
  indicatorClassName?: string;
}) {
  return (
    <div
      data-slot="progress"
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-primary/15',
        className,
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn('h-full bg-primary transition-all', indicatorClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
      />
    </div>
  );
}

export { Progress };

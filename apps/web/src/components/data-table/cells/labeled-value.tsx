import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function LabeledValue({
  label,
  children,
  className,
  valueClassName,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn('space-y-0.5', className)}>
      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className={cn('text-sm leading-snug', valueClassName)}>{children}</div>
    </div>
  );
}

export function LabeledSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-2', className)}>
      <h4 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h4>
      {children}
    </section>
  );
}

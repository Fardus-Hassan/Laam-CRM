'use client';

import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'customer', label: 'Customer' },
  { id: 'products', label: 'Products' },
  { id: 'payment', label: 'Payment' },
] as const;

type CreateOrderStepIndicatorProps = {
  className?: string;
};

export function CreateOrderStepIndicator({ className }: CreateOrderStepIndicatorProps) {
  return (
    <nav aria-label="Create order sections" className={cn('flex flex-wrap gap-2', className)}>
      {STEPS.map((step, index) => (
        <a
          key={step.id}
          href={`#create-order-${step.id}`}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {index + 1}
          </span>
          {step.label}
        </a>
      ))}
    </nav>
  );
}

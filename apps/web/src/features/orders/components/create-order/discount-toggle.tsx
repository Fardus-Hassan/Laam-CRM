'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { DiscountMode } from '@/features/orders/lib/create-order-types';

type DiscountToggleProps = {
  mode: DiscountMode;
  onChange: (mode: DiscountMode) => void;
  className?: string;
};

export function DiscountToggle({ mode, onChange, className }: DiscountToggleProps) {
  return (
    <div className={cn('inline-flex rounded-md border border-input p-0.5', className)}>
      <Button
        type="button"
        size="sm"
        variant={mode === 'amount' ? 'default' : 'ghost'}
        className="h-7 px-2 text-xs"
        onClick={() => onChange('amount')}
      >
        ৳
      </Button>
      <Button
        type="button"
        size="sm"
        variant={mode === 'percent' ? 'default' : 'ghost'}
        className="h-7 px-2 text-xs"
        onClick={() => onChange('percent')}
      >
        %
      </Button>
    </div>
  );
}

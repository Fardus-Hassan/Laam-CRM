'use client';

import { FormInput } from '@/components/form/form-input';
import { cn } from '@/lib/utils';

type MoneyInputProps = Omit<React.ComponentProps<typeof FormInput>, 'type' | 'onChange' | 'value'> & {
  value: number;
  onChange: (value: number) => void;
};

export function MoneyInput({ value, onChange, className, ...props }: MoneyInputProps) {
  return (
    <FormInput
      type="number"
      min={0}
      step="any"
      inputMode="decimal"
      value={Number.isFinite(value) ? value : 0}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
      className={cn('text-right tabular-nums', className)}
      {...props}
    />
  );
}

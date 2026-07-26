'use client';

import { FormField } from '@/components/form/form-field';
import { Label } from '@/components/ui/label';
import type { MerchandisingFlags } from '@/features/inventory/lib/product-merchandising';
import { cn } from '@/lib/utils';

type MerchandisingFlagsFieldProps = {
  value: MerchandisingFlags;
  onChange: (next: MerchandisingFlags) => void;
  disabled?: boolean;
  className?: string;
};

const OPTIONS: Array<{
  key: keyof MerchandisingFlags;
  label: string;
  hint: string;
}> = [
  {
    key: 'isHero',
    label: 'Hero',
    hint: 'Featured main product on Create Order',
  },
  {
    key: 'isUpsell',
    label: 'Upsell',
    hint: 'Bigger pack / higher-value version',
  },
  {
    key: 'isCrossSell',
    label: 'Cross-sell',
    hint: 'Suggest with other products',
  },
];

export function MerchandisingFlagsField({
  value,
  onChange,
  disabled,
  className,
}: MerchandisingFlagsFieldProps) {
  return (
    <FormField
      label="Create Order merchandising"
      className={className}
      hint="Marks how this product appears in the order catalog (Hero / Upsell / Cross-sell)."
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const checked = value[option.key];
          const id = `merch-${option.key}`;
          return (
            <label
              key={option.key}
              htmlFor={id}
              className={cn(
                'flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2.5 transition-colors',
                checked ? 'border-primary/40 bg-primary/5' : 'border-border/70 bg-background',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                id={id}
                type="checkbox"
                className="mt-0.5 size-4 rounded border border-input"
                checked={checked}
                disabled={disabled}
                onChange={(event) =>
                  onChange({ ...value, [option.key]: event.target.checked })
                }
              />
              <span className="min-w-0">
                <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
                  {option.label}
                </Label>
                <p className="text-[11px] leading-snug text-muted-foreground">{option.hint}</p>
              </span>
            </label>
          );
        })}
      </div>
    </FormField>
  );
}

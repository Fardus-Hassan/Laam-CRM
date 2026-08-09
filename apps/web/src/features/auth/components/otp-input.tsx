'use client';

import * as React from 'react';

import { FormInput } from '@/components/form/form-input';
import { cn } from '@/lib/utils';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
};

export function OtpInput({ value, onChange, disabled, className, autoFocus }: OtpInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  return (
    <FormInput
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="000000"
      value={value}
      disabled={disabled}
      className={cn(
        'h-12 text-center font-mono text-2xl tracking-[0.4em] tabular-nums',
        className,
      )}
      onChange={(event) => {
        const next = event.target.value.replace(/\D/g, '').slice(0, 6);
        onChange(next);
      }}
    />
  );
}

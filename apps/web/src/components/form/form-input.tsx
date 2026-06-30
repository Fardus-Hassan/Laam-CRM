'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { FORM_CONTROL_HEIGHT_CLASS } from './form-control';

export type FormInputProps = React.ComponentProps<typeof Input>;

export function FormInput({ className, ...props }: FormInputProps) {
  return (
    <Input
      className={cn(FORM_CONTROL_HEIGHT_CLASS, 'bg-background', className)}
      {...props}
    />
  );
}

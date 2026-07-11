'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { FORM_CONTROL_HEIGHT_CLASS } from './form-control';

export type FormInputProps = React.ComponentProps<typeof Input>;

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  function FormInput({ className, ...props }, ref) {
    return (
      <Input
        ref={ref}
        className={cn(FORM_CONTROL_HEIGHT_CLASS, 'bg-background', className)}
        {...props}
      />
    );
  },
);

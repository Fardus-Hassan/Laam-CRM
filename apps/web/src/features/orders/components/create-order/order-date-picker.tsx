'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { FormField } from '@/components/form/form-field';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { FORM_CONTROL_HEIGHT_CLASS } from '@/components/form/form-control';

type OrderDatePickerProps = {
  value: Date;
  onChange: (date: Date) => void;
  error?: string;
};

export function OrderDatePicker({ value, onChange, error }: OrderDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <FormField label="Date" required error={error}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              FORM_CONTROL_HEIGHT_CLASS,
              'w-full justify-start gap-2 font-normal',
              !value && 'text-muted-foreground',
              error && 'border-destructive',
            )}
          >
            <CalendarIcon className="size-3.5 opacity-70" />
            {value ? format(value, 'dd/MM/yyyy') : 'Select date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              if (date) {
                onChange(date);
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </FormField>
  );
}

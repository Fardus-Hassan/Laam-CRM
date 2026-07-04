'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type DatePickerProps = {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  className?: string;
  align?: 'start' | 'center' | 'end';
  placeholder?: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
};

export function DatePicker({
  value,
  onChange,
  className,
  align = 'end',
  placeholder = 'Select date',
  variant = 'outline',
  size = 'sm',
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const label = value ? format(value, 'd MMM yyyy') : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            'justify-start gap-2 font-normal text-foreground',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-70" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          onSelect={(date) => {
            onChange(date);
            if (date) {
              setOpen(false);
            }
          }}
          disabled={{ after: new Date() }}
        />
      </PopoverContent>
    </Popover>
  );
}

'use client';

import * as React from 'react';

import { DatePicker } from '@/components/date-range/date-picker';

export function DateBadge() {
  const [date, setDate] = React.useState<Date>(() => new Date());

  return (
    <DatePicker
      value={date}
      onChange={(next) => {
        if (next) {
          setDate(next);
        }
      }}
      align="end"
      className="hidden md:inline-flex"
      variant="outline"
      size="sm"
    />
  );
}

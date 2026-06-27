'use client';

import { Calendar } from 'lucide-react';

function formatTopBarDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function DateBadge() {
  const today = formatTopBarDate(new Date());

  return (
    <div className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground md:inline-flex">
      <Calendar className="size-4 text-muted-foreground" />
      <span>{today}</span>
    </div>
  );
}

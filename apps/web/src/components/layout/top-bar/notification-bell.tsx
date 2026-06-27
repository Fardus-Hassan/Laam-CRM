'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

type NotificationBellProps = {
  count?: number;
};

export function NotificationBell({ count = 0 }: NotificationBellProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative size-9 shrink-0 rounded-lg"
      aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
    >
      <Bell className="size-5" />
      {count > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </Button>
  );
}

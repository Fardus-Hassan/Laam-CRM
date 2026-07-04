'use client';

import * as React from 'react';
import Link from 'next/link';
import type { AppNotification } from '@laam/types';
import { Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { notificationsApi } from '@/features/notifications/api/notifications-api';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const [items, setItems] = React.useState<AppNotification[]>([]);
  const unread = items.filter((n) => !n.isRead).length;

  const refresh = React.useCallback(async () => {
    setItems(await notificationsApi.list());
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleOpen(open: boolean) {
    if (open) await refresh();
  }

  async function handleClick(item: AppNotification) {
    if (!item.isRead) {
      await notificationsApi.markRead(item.id);
      await refresh();
    }
  }

  async function handleMarkAll() {
    await notificationsApi.markAllRead();
    await refresh();
  }

  return (
    <DropdownMenu onOpenChange={(open) => void handleOpen(open)}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative size-9 shrink-0 rounded-lg"
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
        >
          <Bell className="size-5" />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unread > 0 ? (
            <button
              type="button"
              className="text-xs font-normal text-primary hover:underline"
              onClick={() => void handleMarkAll()}
            >
              Mark all read
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">No notifications</p>
        ) : (
          items.slice(0, 8).map((item) => (
            <DropdownMenuItem key={item.id} asChild className="cursor-pointer">
              <Link
                href={item.href ?? '#'}
                onClick={() => void handleClick(item)}
                className={cn('flex flex-col items-start gap-0.5 py-2', !item.isRead && 'bg-primary/5')}
              >
                <span className="text-sm font-medium">{item.title}</span>
                <span className="text-xs text-muted-foreground line-clamp-2">{item.body}</span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

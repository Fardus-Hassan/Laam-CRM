'use client';

import * as React from 'react';
import Link from 'next/link';
import type { AppNotification } from '@laam/types';
import { Bell, Trash2 } from 'lucide-react';

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
  const [unread, setUnread] = React.useState(0);

  const refresh = React.useCallback(async () => {
    try {
      const [page, count] = await Promise.all([
        notificationsApi.list({ limit: 8 }),
        notificationsApi.unreadCount(),
      ]);
      setItems(page.items);
      setUnread(count);
    } catch {
      setItems([]);
      setUnread(0);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 30_000);
    return () => window.clearInterval(interval);
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

  async function handleDeleteOne(event: React.MouseEvent, id: string) {
    event.preventDefault();
    event.stopPropagation();
    await notificationsApi.deleteOne(id);
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
      <DropdownMenuContent align="end" className="w-[min(28rem,calc(100vw-1.5rem))] sm:w-[28rem]">
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
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className={cn('cursor-pointer gap-2 p-0', !item.isRead && 'bg-primary/5')}
              onSelect={(event) => event.preventDefault()}
            >
              <Link
                href={item.href ?? '/dashboard/notifications'}
                onClick={() => void handleClick(item)}
                className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-2 py-2"
              >
                <span className="text-sm font-medium">{item.title}</span>
                <span className="text-xs text-muted-foreground line-clamp-2">{item.body}</span>
              </Link>
              <button
                type="button"
                className="mr-1.5 shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                aria-label={`Delete ${item.title}`}
                onClick={(event) => void handleDeleteOne(event, item.id)}
              >
                <Trash2 className="size-3.5" />
              </button>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer justify-center">
          <Link href="/dashboard/notifications" className="text-sm font-medium text-primary">
            View all
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

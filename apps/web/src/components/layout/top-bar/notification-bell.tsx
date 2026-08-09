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
import { openNotificationUnreadStream } from '@/features/notifications/lib/notification-unread-stream';
import { formatNotificationTime } from '@/lib/format-relative-time';
import { cn } from '@/lib/utils';

/** Slow backup if SSE drops; primary updates are instant via stream. */
const UNREAD_BACKUP_POLL_MS = 180_000;

export function NotificationBell() {
  const [items, setItems] = React.useState<AppNotification[]>([]);
  const [unread, setUnread] = React.useState(0);
  const menuOpenRef = React.useRef(false);
  const lastUnreadRef = React.useRef<number | null>(null);

  const refreshUnread = React.useCallback(async () => {
    try {
      const count = await notificationsApi.unreadCount();
      setUnread(count);
    } catch {
      // keep previous badge on transient errors
    }
  }, []);

  const refreshPreview = React.useCallback(async () => {
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
    const ac = new AbortController();
    let retryTimer = 0;
    let attempt = 0;

    async function connect() {
      try {
        attempt = 0;
        await openNotificationUnreadStream({
          signal: ac.signal,
          onUnread: (count) => {
            const prev = lastUnreadRef.current;
            lastUnreadRef.current = count;
            setUnread(count);
            // Dropdown open + new unread → refresh list so OTP purpose shows live.
            if (menuOpenRef.current && prev !== null && count > prev) {
              void refreshPreview();
            }
          },
        });
      } catch {
        // fall through to reconnect
      }
      if (ac.signal.aborted) return;
      attempt += 1;
      const delay = Math.min(30_000, 1500 * 2 ** Math.min(attempt, 4));
      retryTimer = window.setTimeout(() => void connect(), delay);
    }

    void connect();

    const backup = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void refreshUnread();
    }, UNREAD_BACKUP_POLL_MS);

    function onVisibleOrFocus() {
      if (document.visibilityState === 'hidden') return;
      void refreshUnread();
    }
    window.addEventListener('focus', onVisibleOrFocus);
    document.addEventListener('visibilitychange', onVisibleOrFocus);

    return () => {
      ac.abort();
      window.clearTimeout(retryTimer);
      window.clearInterval(backup);
      window.removeEventListener('focus', onVisibleOrFocus);
      document.removeEventListener('visibilitychange', onVisibleOrFocus);
    };
  }, [refreshUnread, refreshPreview]);

  async function handleOpen(open: boolean) {
    menuOpenRef.current = open;
    if (open) await refreshPreview();
  }

  async function handleClick(item: AppNotification) {
    if (!item.isRead) {
      await notificationsApi.markRead(item.id);
      await refreshPreview();
    }
  }

  async function handleMarkAll() {
    await notificationsApi.markAllRead();
    await refreshPreview();
  }

  async function handleDeleteOne(event: React.MouseEvent, id: string) {
    event.preventDefault();
    event.stopPropagation();
    await notificationsApi.deleteOne(id);
    await refreshPreview();
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
                <time
                  className="text-[11px] text-muted-foreground/80"
                  dateTime={item.createdAt}
                >
                  {formatNotificationTime(item.createdAt)}
                </time>
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

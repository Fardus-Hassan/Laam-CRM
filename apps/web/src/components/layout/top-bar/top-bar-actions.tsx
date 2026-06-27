'use client';

import { DateBadge } from '@/components/layout/top-bar/date-badge';
import { LiveStatusBadge } from '@/components/layout/top-bar/live-status-badge';
import { NotificationBell } from '@/components/layout/top-bar/notification-bell';
import { TopBarUser } from '@/components/layout/top-bar/top-bar-user';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function TopBarActions() {
  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <LiveStatusBadge />
      <DateBadge />
      <NotificationBell count={8} />
      <ThemeToggle />
      <TopBarUser />
    </div>
  );
}

'use client';

import { CommandPaletteTrigger } from '@/components/command-palette/command-palette-trigger';
import { Can } from '@/components/auth/can';
import { CreateOrderButton } from '@/components/layout/top-bar/create-order-button';
import { FullscreenToggle } from '@/components/layout/top-bar/fullscreen-toggle';
import { DateBadge } from '@/components/layout/top-bar/date-badge';
import { NotificationBell } from '@/components/layout/top-bar/notification-bell';
import { TopBarUser } from '@/components/layout/top-bar/top-bar-user';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function TopBarActions() {
  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <CommandPaletteTrigger />
      <CreateOrderButton />
      <DateBadge />
      <Can permission="notifications.view">
        <NotificationBell />
      </Can>
      <FullscreenToggle />
      <ThemeToggle />
      <TopBarUser />
    </div>
  );
}

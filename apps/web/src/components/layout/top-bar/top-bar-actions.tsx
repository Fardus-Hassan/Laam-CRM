'use client';

import { CommandPaletteTrigger } from '@/components/command-palette/command-palette-trigger';
import { Can } from '@/components/auth/can';
import { CreateOrderButton } from '@/components/layout/top-bar/create-order-button';
import { FullscreenToggle } from '@/components/layout/top-bar/fullscreen-toggle';
import { NotificationBell } from '@/components/layout/top-bar/notification-bell';
import { PageRefreshButton } from '@/components/layout/top-bar/page-refresh-button';
import { TopBarUser } from '@/components/layout/top-bar/top-bar-user';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { OrderRealtimeBridge } from '@/features/orders/components/order-realtime-bridge';

export function TopBarActions() {
  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <OrderRealtimeBridge />
      <CommandPaletteTrigger />
      <CreateOrderButton />
      <PageRefreshButton />
      <Can permission="notifications.view">
        <NotificationBell />
      </Can>
      <FullscreenToggle />
      <ThemeToggle />
      <TopBarUser />
    </div>
  );
}

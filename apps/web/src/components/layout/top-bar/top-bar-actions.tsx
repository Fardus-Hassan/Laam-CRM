'use client';

import { CommandPaletteTrigger } from '@/components/command-palette/command-palette-trigger';
import { Can } from '@/components/auth/can';
import { CreateOrderButton } from '@/components/layout/top-bar/create-order-button';
import { FullscreenToggle } from '@/components/layout/top-bar/fullscreen-toggle';
import { NotificationBell } from '@/components/layout/top-bar/notification-bell';
import { PageRefreshButton } from '@/components/layout/top-bar/page-refresh-button';
import { TopBarMobileMore } from '@/components/layout/top-bar/top-bar-mobile-more';
import { TopBarUser } from '@/components/layout/top-bar/top-bar-user';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { OrderRealtimeBridge } from '@/features/orders/components/order-realtime-bridge';

export function TopBarActions() {
  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 md:gap-2">
      <OrderRealtimeBridge />
      <CommandPaletteTrigger />
      <CreateOrderButton />
      {/* Desktop: individual utility buttons */}
      <div className="hidden items-center gap-1.5 md:flex md:gap-2">
        <PageRefreshButton />
        <Can permission="notifications.view">
          <NotificationBell />
        </Can>
        <FullscreenToggle />
        <ThemeToggle />
      </div>
      {/* Mobile: bell + overflow (refresh, theme, fullscreen) */}
      <div className="flex items-center gap-1 md:hidden">
        <Can permission="notifications.view">
          <NotificationBell className="size-8 rounded-lg" />
        </Can>
        <TopBarMobileMore />
      </div>
      <TopBarUser />
    </div>
  );
}

'use client';

import * as React from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { NavMain } from '@/components/navigation/nav-main';
import { NavUser } from '@/components/navigation/nav-user';
import { SidebarBrandHeader } from '@/components/navigation/sidebar-brand-header';
import { NavMainSkeleton } from '@/components/navigation/nav-main-skeleton';
import { Sidebar, SidebarFooter, SidebarRail } from '@/components/ui/sidebar';

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { isLoading } = useAuth();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarBrandHeader />
      {isLoading ? (
        <NavMainSkeleton />
      ) : (
        <React.Suspense fallback={<NavMainSkeleton />}>
          <NavMain />
        </React.Suspense>
      )}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

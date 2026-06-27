'use client';

import { useNavigation } from '@/features/navigation/hooks/use-navigation';
import { NavMain } from '@/components/navigation/nav-main';
import { NavUser } from '@/components/navigation/nav-user';
import { SidebarBrandHeader } from '@/components/navigation/sidebar-brand-header';
import { Sidebar, SidebarFooter, SidebarRail } from '@/components/ui/sidebar';

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const navGroups = useNavigation();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarBrandHeader />
      <NavMain groups={navGroups} />
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

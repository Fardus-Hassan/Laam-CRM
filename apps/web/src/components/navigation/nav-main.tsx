'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigation } from '@/features/navigation/hooks/use-navigation';
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { siteConfig } from '@/config/site';

function isNavItemActive(pathname: string, url: string) {
  return (
    pathname === url ||
    (url !== siteConfig.dashboardRoute && pathname.startsWith(url))
  );
}

export function NavMain() {
  const pathname = usePathname();
  const groups = useNavigation();

  return (
    <SidebarContent className="gap-2 px-2 py-3">
      {groups.map((group) => (
        <SidebarGroup key={group.id} className="p-0">
          <SidebarGroupLabel className="px-3 mt-2 text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/60">
            {group.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {group.items.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={isNavItemActive(pathname, item.url)}
                    tooltip={item.title}
                    className="h-8 rounded px-3 text-sidebar-foreground"
                  >
                    <Link href={item.url}>
                      <item.icon className="size-[18px]" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </SidebarContent>
  );
}

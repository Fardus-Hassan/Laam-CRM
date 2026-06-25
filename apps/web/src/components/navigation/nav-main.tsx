'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ResolvedNavGroup } from '@/features/navigation/lib/filter-navigation';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { siteConfig } from '@/config/site';

type NavMainProps = {
  groups: ResolvedNavGroup[];
};

function isNavItemActive(pathname: string, url: string) {
  return (
    pathname === url ||
    (url !== siteConfig.dashboardRoute && pathname.startsWith(url))
  );
}

export function NavMain({ groups }: NavMainProps) {
  const pathname = usePathname();

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.id}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={isNavItemActive(pathname, item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

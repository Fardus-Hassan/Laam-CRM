'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { useNavigation } from '@/features/navigation/hooks/use-navigation';
import {
  isNavItemBranchActive,
  isNavUrlActive,
} from '@/features/navigation/lib/nav-active';
import type { ResolvedNavItem } from '@/features/navigation/types/universal-nav';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';

function NavLeafItem({
  item,
  pathname,
  searchParams,
}: {
  item: ResolvedNavItem;
  pathname: string;
  searchParams: URLSearchParams;
}) {
  if (!item.url) {
    return null;
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isNavUrlActive(pathname, searchParams, item.url)}
        tooltip={item.title}
        className="h-8 rounded px-3 text-sidebar-foreground"
      >
        <Link href={item.url}>
          <item.icon className="size-[18px]" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavBranchItem({
  item,
  pathname,
  searchParams,
}: {
  item: ResolvedNavItem;
  pathname: string;
  searchParams: URLSearchParams;
}) {
  const isActive = isNavItemBranchActive(pathname, searchParams, item);
  const defaultOpen = isActive;

  return (
    <Collapsible
      asChild
      defaultOpen={defaultOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={isActive}
            className="h-8 rounded px-3 text-sidebar-foreground"
          >
            <item.icon className="size-[18px]" />
            <span>{item.title}</span>
            <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((child) => (
              <SidebarMenuSubItem key={child.id}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isNavUrlActive(pathname, searchParams, child.url)}
                >
                  <Link href={child.url}>
                    <span>{child.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function NavItem({
  item,
  pathname,
  searchParams,
}: {
  item: ResolvedNavItem;
  pathname: string;
  searchParams: URLSearchParams;
}) {
  if (item.children?.length) {
    return (
      <NavBranchItem item={item} pathname={pathname} searchParams={searchParams} />
    );
  }

  return <NavLeafItem item={item} pathname={pathname} searchParams={searchParams} />;
}

export function NavMain() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const groups = useNavigation();

  return (
    <SidebarContent className="gap-2 px-2 py-3">
      {groups.map((group) => (
        <SidebarGroup key={group.id} className="p-0">
          <SidebarGroupLabel className="mt-2 px-3 text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/60">
            {group.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {group.items.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  pathname={pathname}
                  searchParams={searchParams}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </SidebarContent>
  );
}

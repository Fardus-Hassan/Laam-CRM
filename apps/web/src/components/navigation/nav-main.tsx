'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { useNavigation } from '@/features/navigation/hooks/use-navigation';
import {
  isNavItemBranchActive,
  isNavItemBranchOpenByPath,
  isNavUrlActive,
} from '@/features/navigation/lib/nav-active';
import type { ResolvedNavChild, ResolvedNavItem } from '@/features/navigation/types/universal-nav';
import { cn } from '@/lib/utils';
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

function NavCountBadge({ count }: { count: number }) {
  const label = count > 9999 ? '9999+' : String(count);
  const isHigh = count >= 100;

  return (
    <span
      className={cn(
        'ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none',
        isHigh
          ? 'ring-1 ring-black/10'
          : 'bg-white/12 text-sidebar-foreground/90 ring-1 ring-white/10',
      )}
      style={
        isHigh
          ? {
              backgroundColor: 'var(--brand-accent, #FFD700)',
              color: 'var(--brand-accent-fg, #1a1a1a)',
            }
          : undefined
      }
    >
      {label}
    </span>
  );
}

function NavSubDot({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'nav-sub-dot size-1.5 shrink-0 rounded-full bg-sidebar-foreground/35 transition-opacity duration-150',
        active && 'bg-sidebar-primary-foreground opacity-100',
      )}
    />
  );
}

function NavSubLeaf({
  item,
  pathname,
  searchParams,
  depth = 0,
}: {
  item: ResolvedNavChild;
  pathname: string;
  searchParams: URLSearchParams;
  depth?: number;
}) {
  const active = isNavUrlActive(pathname, searchParams, item.url);

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={active} data-depth={depth}>
        <Link href={item.url}>
          <NavSubDot active={active} />
          <span className="min-w-0 flex-1 truncate">{item.title}</span>
          {item.badge != null && item.badge > 0 ? <NavCountBadge count={item.badge} /> : null}
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function NavSubBranch({
  item,
  pathname,
  searchParams,
  depth = 0,
}: {
  item: ResolvedNavChild;
  pathname: string;
  searchParams: URLSearchParams;
  depth?: number;
}) {
  const branchActive = isNavItemBranchActive(pathname, searchParams, item);
  const branchOpenByPath = isNavItemBranchOpenByPath(pathname, item);
  const shouldExpand = branchActive || branchOpenByPath;
  const selfActive = isNavUrlActive(pathname, searchParams, item.url);
  const [open, setOpen] = React.useState(shouldExpand);

  React.useEffect(() => {
    if (shouldExpand) {
      setOpen(true);
    }
  }, [shouldExpand, pathname, searchParams.toString()]);

  React.useEffect(() => {
    if (!branchOpenByPath && !branchActive) {
      setOpen(false);
    }
  }, [pathname, branchOpenByPath, branchActive]);

  return (
    <SidebarMenuSubItem>
      <Collapsible open={open} onOpenChange={setOpen} className="group/subcollapsible">
        <div className="flex items-center gap-0.5">
          <SidebarMenuSubButton asChild isActive={selfActive} data-depth={depth} className="min-w-0 flex-1">
            <Link href={item.url}>
              <NavSubDot active={selfActive || branchActive} />
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              {item.badge != null && item.badge > 0 ? <NavCountBadge count={item.badge} /> : null}
            </Link>
          </SidebarMenuSubButton>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-white/[0.06] hover:text-sidebar-foreground"
              aria-label={`Toggle ${item.title} sub-menu`}
            >
              <ChevronRight className="size-3.5 transition-transform duration-200 ease-out group-data-[state=open]/subcollapsible:rotate-90" />
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <SidebarMenuSub className="ml-2 border-l border-sidebar-border/60 pl-1">
            {item.children?.map((child) => (
              <NavSubTree
                key={child.id}
                item={child}
                pathname={pathname}
                searchParams={searchParams}
                depth={depth + 1}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuSubItem>
  );
}

function NavSubTree({
  item,
  pathname,
  searchParams,
  depth = 0,
}: {
  item: ResolvedNavChild;
  pathname: string;
  searchParams: URLSearchParams;
  depth?: number;
}) {
  if (item.children?.length) {
    return (
      <NavSubBranch
        item={item}
        pathname={pathname}
        searchParams={searchParams}
        depth={depth}
      />
    );
  }

  return (
    <NavSubLeaf item={item} pathname={pathname} searchParams={searchParams} depth={depth} />
  );
}

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
        className="h-9 rounded-lg px-3 text-sidebar-foreground transition-colors duration-150"
      >
        <Link href={item.url}>
          <item.icon className="size-[18px]" />
          <span className="flex-1 truncate">{item.title}</span>
          {item.badge != null && item.badge > 0 ? <NavCountBadge count={item.badge} /> : null}
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
  const branchActive = isNavItemBranchActive(pathname, searchParams, item);
  const branchOpenByPath = isNavItemBranchOpenByPath(pathname, item);
  const shouldExpand = branchActive || branchOpenByPath;
  const parentActive = item.url
    ? isNavUrlActive(pathname, searchParams, item.url)
    : false;
  const [open, setOpen] = React.useState(shouldExpand);

  React.useEffect(() => {
    if (shouldExpand) {
      setOpen(true);
    }
  }, [shouldExpand, pathname, searchParams.toString()]);

  React.useEffect(() => {
    if (!branchOpenByPath && !branchActive) {
      setOpen(false);
    }
  }, [pathname, branchOpenByPath, branchActive]);

  return (
    <Collapsible
      asChild
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={parentActive}
            className="h-9 rounded-lg px-3 text-sidebar-foreground transition-colors duration-150 group-data-[state=open]/collapsible:bg-white/[0.06] data-[active=true]:group-data-[state=open]/collapsible:bg-sidebar-primary"
          >
            <item.icon className="size-[18px] shrink-0" />
            <span className="flex-1 truncate">{item.title}</span>
            <ChevronRight className="ml-auto size-4 shrink-0 opacity-70 transition-transform duration-200 ease-out group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="pb-1">
          <SidebarMenuSub>
            {item.children?.map((child) => (
              <NavSubTree
                key={child.id}
                item={child}
                pathname={pathname}
                searchParams={searchParams}
              />
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
          {group.label.trim() ? (
            <SidebarGroupLabel className="mt-2 px-3 text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/60">
              {group.label}
            </SidebarGroupLabel>
          ) : null}
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

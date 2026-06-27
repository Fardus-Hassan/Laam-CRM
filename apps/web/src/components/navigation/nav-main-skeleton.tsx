'use client';

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

const SKELETON_GROUPS = [
  { id: 'overview', items: 1 },
  { id: 'sales', items: 5 },
  { id: 'work', items: 2 },
  { id: 'insights', items: 1 },
] as const;

export function NavMainSkeleton() {
  return (
    <SidebarContent className="gap-2 px-2 py-3">
      {SKELETON_GROUPS.map((group) => (
        <SidebarGroup key={group.id} className="p-0">
          <SidebarGroupLabel className="px-3 mt-2">
            <Skeleton className="h-2.5 w-16 bg-sidebar-accent" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {Array.from({ length: group.items }).map((_, index) => (
              <SidebarMenuSkeleton
                key={`${group.id}-${index}`}
                showIcon
                className="[&_[data-sidebar=menu-skeleton-icon]]:bg-sidebar-accent [&_[data-sidebar=menu-skeleton-text]]:bg-sidebar-accent"
              />
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </SidebarContent>
  );
}

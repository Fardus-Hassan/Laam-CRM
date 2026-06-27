'use client';

import * as React from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand/brand-logo';
import { siteConfig } from '@/config/site';
import { SidebarHeader, useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export function SidebarBrandHeader() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
      <Link
        href={siteConfig.dashboardRoute}
        className={cn(
          'flex items-center justify-center rounded-md outline-none',
          'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          isCollapsed ? 'px-0' : 'px-1',
        )}
        aria-label="Go to dashboard"
      >
        <BrandLogo
          priority
          width={isCollapsed ? 32 : 140}
          height={isCollapsed ? 32 : 48}
          className={isCollapsed ? 'max-w-8' : 'max-w-[140px]'}
        />
      </Link>
    </SidebarHeader>
  );
}

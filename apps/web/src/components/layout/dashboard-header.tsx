'use client';

import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { TopBarActions } from '@/components/layout/top-bar/top-bar-actions';
import { siteConfig } from '@/config/site';

export type BreadcrumbItemConfig = {
  label: string;
  href?: string;
};

type DashboardHeaderProps = {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItemConfig[];
};

export function DashboardHeader({
  title,
  description,
  breadcrumbs = [],
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center justify-between gap-2 border-b bg-background/95 px-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:h-14 sm:gap-3 sm:px-3 md:h-16 md:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
        <SidebarTrigger className="-ml-0.5 size-8 shrink-0 sm:-ml-1" />
        <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />
        {breadcrumbs.length > 0 ? (
          <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-nowrap">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                const hideOnMobile = !isLast && breadcrumbs.length > 1;

                return (
                  <span key={`${crumb.label}-${index}`} className="contents">
                    <BreadcrumbItem className={hideOnMobile ? 'hidden min-w-0 sm:inline-flex' : 'min-w-0'}>
                      {isLast || !crumb.href ? (
                        <BreadcrumbPage className="max-w-[11rem] truncate sm:max-w-[20rem]">
                          {crumb.label}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={crumb.href} className="truncate">
                          {crumb.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast ? (
                      <BreadcrumbSeparator className={hideOnMobile ? 'hidden sm:block' : undefined} />
                    ) : null}
                  </span>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        ) : (
          <div className="min-w-0">
            <h1 className="truncate text-sm font-medium sm:text-base">{title}</h1>
            {description ? (
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {description}
              </p>
            ) : null}
          </div>
        )}
      </div>
      <TopBarActions />
    </header>
  );
}

export function createModuleBreadcrumbs(title: string): BreadcrumbItemConfig[] {
  return [
    { label: 'Dashboard', href: siteConfig.dashboardRoute },
    { label: title },
  ];
}

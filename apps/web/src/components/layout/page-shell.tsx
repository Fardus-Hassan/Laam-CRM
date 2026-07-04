'use client';

import {
  DashboardHeader,
  createModuleBreadcrumbs,
  type BreadcrumbItemConfig,
} from '@/components/layout/dashboard-header';

type PageShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItemConfig[];
};

export function PageShell({ title, description, children, breadcrumbs }: PageShellProps) {
  return (
    <>
      <DashboardHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs ?? createModuleBreadcrumbs(title)}
      />
      {/*
        [&>*]:min-w-0 lets wide tables shrink and scroll horizontally inside
        their own overflow-x-auto containers (instead of blowing out the page).
        overflow-x-clip avoids a nested vertical scrollport (scrollbar stays
        flush on the dashboard shell).
      */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-x-clip p-3 sm:gap-4 sm:p-4 [&>*]:min-w-0">
        {children}
      </div>
    </>
  );
}

export type { BreadcrumbItemConfig };

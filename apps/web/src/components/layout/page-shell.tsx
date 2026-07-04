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
        Do not use overflow-x-hidden here — it creates a nested scrollport and
        pulls the scrollbar inward (away from the screen edge). Horizontal clip
        only; vertical scroll stays on the dashboard shell.
      */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-x-clip p-3 sm:gap-4 sm:p-4">
        {children}
      </div>
    </>
  );
}

export type { BreadcrumbItemConfig };

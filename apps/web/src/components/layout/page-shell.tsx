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
      <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
    </>
  );
}

export type { BreadcrumbItemConfig };

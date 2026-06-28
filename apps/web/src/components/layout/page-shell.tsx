'use client';

import {
  DashboardHeader,
  createModuleBreadcrumbs,
} from '@/components/layout/dashboard-header';

type PageShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <>
      <DashboardHeader
        title={title}
        description={description}
        breadcrumbs={createModuleBreadcrumbs(title)}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
    </>
  );
}

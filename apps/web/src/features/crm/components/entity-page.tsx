'use client';

import type { CrmModuleDefinition } from '@/features/crm/config/modules';
import { PageShell } from '@/components/layout/page-shell';
import { EmptyState } from '@/components/layout/empty-state';

type EntityPageProps = {
  module: CrmModuleDefinition;
  children?: React.ReactNode;
};

/**
 * Standard CRM list/detail shell. Pages stay thin; data hooks plug in later.
 */
export function EntityPage({ module, children }: EntityPageProps) {
  return (
    <PageShell title={module.title} description={module.description}>
      {children ?? (
        <EmptyState
          title={module.title}
          description={`${module.description} Data will load from ${module.apiPath} once the API is connected.`}
        />
      )}
    </PageShell>
  );
}

'use client';

import type { CrmModuleDefinition } from '@/features/crm/config/modules';
import { CrmPageActions } from '@/features/crm/components/crm-page-actions';
import { PageShell } from '@/components/layout/page-shell';
import { EmptyState } from '@/components/layout/empty-state';

type EntityPageProps = {
  module: CrmModuleDefinition;
  children?: React.ReactNode;
  /** Hide default permission-gated action bar. */
  hideActions?: boolean;
};

/**
 * Standard CRM list/detail shell. Pages stay thin; data hooks plug in later.
 */
export function EntityPage({ module, children, hideActions }: EntityPageProps) {
  return (
    <PageShell title={module.title} description={module.description}>
      <div className="space-y-4">
        {hideActions ? null : <CrmPageActions moduleId={module.id} />}
        {children ?? (
          <EmptyState
            title={module.title}
            description={`${module.description} Data will load from ${module.apiPath} once the API is connected.`}
          />
        )}
      </div>
    </PageShell>
  );
}

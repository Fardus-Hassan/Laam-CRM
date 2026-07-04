'use client';

import { useSearchParams } from 'next/navigation';

import { LeadListShell } from '@/features/leads/components/lead-list/lead-list-shell';
import { resolveLeadListContext } from '@/features/leads/config/lead-list-context';

type LeadsListPageProps = {
  status?: string;
  source?: string;
};

export function LeadsListPage({ status, source }: LeadsListPageProps) {
  const searchParams = useSearchParams();
  const context = resolveLeadListContext({
    status: status ?? searchParams.get('status') ?? undefined,
    source: source ?? searchParams.get('source') ?? undefined,
  });

  return <LeadListShell context={context} />;
}

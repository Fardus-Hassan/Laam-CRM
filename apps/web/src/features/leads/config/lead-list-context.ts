import type { LeadStatus, OrderSource } from '@laam/types';

import {
  getLeadTabById,
  LEAD_PIPELINE_TABS,
} from '@/features/leads/config/lead-status-config';
import { LEAD_SOURCE_LABELS } from '@/features/leads/config/lead-filters';

export type LeadListContext = {
  statusFilter?: LeadStatus | 'unassigned';
  sourceFilter?: OrderSource;
  title: string;
  description: string;
  activeTabId: LeadStatus | 'all' | 'unassigned';
};

export function resolveLeadListContext(params: {
  status?: string;
  source?: string;
}): LeadListContext {
  const statusParam = params.status;
  const sourceParam = params.source as OrderSource | undefined;

  let activeTabId: LeadListContext['activeTabId'] = 'all';
  let statusFilter: LeadListContext['statusFilter'];

  if (statusParam === 'unassigned') {
    activeTabId = 'unassigned';
    statusFilter = 'unassigned';
  } else if (
    statusParam &&
    LEAD_PIPELINE_TABS.some((tab) => tab.id === statusParam && tab.id !== 'all')
  ) {
    activeTabId = statusParam as LeadStatus;
    statusFilter = statusParam as LeadStatus;
  }

  const tab = getLeadTabById(activeTabId) ?? LEAD_PIPELINE_TABS[0];
  const sourceLabel = sourceParam ? LEAD_SOURCE_LABELS[sourceParam] : undefined;

  return {
    statusFilter,
    sourceFilter: sourceParam,
    activeTabId,
    title: sourceLabel ? `${tab.label} · ${sourceLabel}` : tab.label,
    description: sourceLabel
      ? `${tab.description} — filtered by ${sourceLabel} source.`
      : tab.description,
  };
}

export function buildLeadTabHref(
  tabId: LeadStatus | 'all' | 'unassigned',
  source?: OrderSource,
): string {
  const params = new URLSearchParams();
  if (tabId !== 'all') {
    params.set('status', tabId);
  }
  if (source) {
    params.set('source', source);
  }
  const query = params.toString();
  return query ? `/dashboard/leads?${query}` : '/dashboard/leads';
}

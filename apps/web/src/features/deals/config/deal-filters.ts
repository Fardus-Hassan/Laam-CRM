import type { DealStage } from '@laam/types';

export const DEAL_STAGE_ORDER: DealStage[] = [
  'new_lead',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
];

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  new_lead: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

export const DEAL_STAGE_FILTERS: {
  id: string;
  label: string;
  href: string;
  isActive: (params: URLSearchParams) => boolean;
}[] = [
  {
    id: 'all',
    label: 'All Deals',
    href: '/dashboard/deals',
    isActive: (params) => !params.get('stage'),
  },
  ...DEAL_STAGE_ORDER.filter((s) => s !== 'lost').map((stage) => ({
    id: stage,
    label: DEAL_STAGE_LABELS[stage],
    href: `/dashboard/deals?stage=${stage}`,
    isActive: (params: URLSearchParams) => params.get('stage') === stage,
  })),
];

export function getDealPageCopy(stage?: string) {
  if (stage && stage in DEAL_STAGE_LABELS) {
    return {
      title: `${DEAL_STAGE_LABELS[stage as DealStage]} Deals`,
      description: `Deals in ${DEAL_STAGE_LABELS[stage as DealStage].toLowerCase()} stage.`,
    };
  }
  return {
    title: 'Deals',
    description: 'Monitor deal stages, amounts, and close dates.',
  };
}

export function getPipelinePageCopy() {
  return {
    title: 'Pipeline',
    description: 'Visualize your sales funnel and forecast revenue.',
  };
}

import type {
  DealDetail,
  DealListItem,
  DealListQuery,
  DealListResponse,
  PipelineResponse,
} from '@laam/types';

import { DEAL_STAGE_ORDER } from '@/features/deals/config/deal-filters';

const AGENTS = ['Sakib Ahmed', 'Mitu Rahman', 'Imran Hossain', 'Tania Sultana'];
const COMPANIES = ['Akash Traders', 'Green Valley Ltd', 'Dhaka Mart', 'Star Electronics', 'Premium Foods'];

function buildDeal(
  index: number,
  overrides: Partial<DealListItem> & Pick<DealListItem, 'title' | 'stage'>,
): DealDetail {
  const dealNumber = `DL-${3000 + index}`;
  const amount = 25000 + index * 8000;
  const probability = overrides.probability ?? Math.min(90, 20 + index * 8);
  const createdDay = 22 - (index % 10);
  const createdAt = `2024-05-${String(createdDay).padStart(2, '0')}T14:00:00.000Z`;
  const updatedAt = `2024-05-${String(createdDay + 1).padStart(2, '0')}T10:00:00.000Z`;

  const base: DealListItem = {
    id: `deal-${index}`,
    dealNumber,
    title: overrides.title,
    companyName: overrides.companyName ?? COMPANIES[index % COMPANIES.length],
    contactName: overrides.contactName ?? `Contact ${index}`,
    stage: overrides.stage,
    amount: overrides.amount ?? amount,
    probability,
    expectedCloseDate: overrides.expectedCloseDate ?? `2024-06-${String(10 + (index % 15)).padStart(2, '0')}`,
    assignedAgentName: overrides.assignedAgentName ?? AGENTS[index % AGENTS.length],
    createdAt,
    updatedAt,
  };

  return {
    ...base,
    notes: index % 4 === 0 ? 'Follow up on pricing next week.' : undefined,
    companyId: `company-${(index % 5) + 1}`,
    contactId: `contact-${index}`,
    leadId: `lead-${index}`,
    wonAt: base.stage === 'won' ? updatedAt : undefined,
    lostReason: base.stage === 'lost' ? 'Budget constraints' : undefined,
    activities: [
      {
        id: `${base.id}-a1`,
        type: 'created',
        label: 'Deal created',
        timestamp: base.createdAt,
        actorName: base.assignedAgentName,
      },
      {
        id: `${base.id}-a2`,
        type: 'stage_change',
        label: `Moved to ${base.stage.replace('_', ' ')}`,
        timestamp: base.updatedAt,
        actorName: base.assignedAgentName,
      },
    ],
  };
}

export const MOCK_DEALS: DealDetail[] = [
  buildDeal(1, { title: 'Bulk dates order', stage: 'new_lead' }),
  buildDeal(2, { title: 'Corporate gift hampers', stage: 'new_lead' }),
  buildDeal(3, { title: 'Monthly supply contract', stage: 'contacted' }),
  buildDeal(4, { title: 'Festival promotion', stage: 'contacted' }),
  buildDeal(5, { title: 'Retail partnership', stage: 'qualified' }),
  buildDeal(6, { title: 'E-commerce integration', stage: 'qualified' }),
  buildDeal(7, { title: 'Wholesale nuts supply', stage: 'proposal' }),
  buildDeal(8, { title: 'Hotel catering deal', stage: 'proposal' }),
  buildDeal(9, { title: 'Supermarket chain', stage: 'negotiation' }),
  buildDeal(10, { title: 'Export order Q2', stage: 'negotiation' }),
  buildDeal(11, { title: 'Ramadan campaign', stage: 'won', amount: 120000 }),
  buildDeal(12, { title: 'Office pantry supply', stage: 'won', amount: 85000 }),
  buildDeal(13, { title: 'Trial order', stage: 'lost' }),
  buildDeal(14, { title: 'Seasonal promo', stage: 'new_lead' }),
  buildDeal(15, { title: 'Distributor agreement', stage: 'qualified' }),
];

export function getMockDealById(id: string): DealDetail | undefined {
  return MOCK_DEALS.find((d) => d.dealNumber === id || d.id === id);
}

export function filterMockDeals(query: DealListQuery): DealListResponse {
  const search = query.search?.trim().toLowerCase() ?? '';
  const allMatching = MOCK_DEALS.filter((deal) => {
    if (query.stage && deal.stage !== query.stage) return false;
    if (!search) return true;
    return (
      deal.dealNumber.toLowerCase().includes(search) ||
      deal.title.toLowerCase().includes(search) ||
      deal.companyName.toLowerCase().includes(search) ||
      (deal.contactName?.toLowerCase().includes(search) ?? false)
    );
  });

  const total = allMatching.length;
  const totalAmount = allMatching.reduce((sum, d) => sum + d.amount, 0);
  const weightedAmount = allMatching.reduce((sum, d) => sum + d.amount * (d.probability / 100), 0);
  const start = (query.page - 1) * query.pageSize;

  return {
    items: allMatching.slice(start, start + query.pageSize).map(
      ({ activities: _a, notes: _n, companyId: _c, contactId: _ct, leadId: _l, wonAt: _w, lostReason: _lr, ...listItem }) =>
        listItem,
    ),
    total,
    page: query.page,
    pageSize: query.pageSize,
    summary: { count: total, totalAmount, weightedAmount },
  };
}

export function getMockPipeline(): PipelineResponse {
  const listResponse = filterMockDeals({ page: 1, pageSize: 100 });
  const allDeals = MOCK_DEALS.map(
    ({ activities: _a, notes: _n, companyId: _c, contactId: _ct, leadId: _l, wonAt: _w, lostReason: _lr, ...listItem }) =>
      listItem,
  );

  const stages = DEAL_STAGE_ORDER.map((stage) => {
    const deals = allDeals.filter((d) => d.stage === stage);
    return {
      stage,
      count: deals.length,
      totalAmount: deals.reduce((sum, d) => sum + d.amount, 0),
      deals,
    };
  });

  return {
    stages,
    summary: listResponse.summary,
  };
}

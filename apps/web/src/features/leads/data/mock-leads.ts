import type {
  LeadDetail,
  LeadListItem,
  LeadListQuery,
  LeadListResponse,
} from '@laam/types';

const AGENTS = ['Sakib Ahmed', 'Mitu Rahman', 'Imran Hossain', 'Tania Sultana', 'Arif Mahmud'];
const AREAS = ['Gulshan', 'Banani', 'Dhanmondi', 'Mirpur', 'Uttara', 'Mohammadpur', 'Bashundhara'];
const CAMPAIGNS = ['Ramadan Sale', 'FB Lead Form', 'Instagram DM', 'Google Ads', 'Landing Page A'];

function buildLead(
  index: number,
  overrides: Partial<LeadListItem> & Pick<LeadListItem, 'name' | 'status'>,
): LeadDetail {
  const leadNumber = `LD-${2000 + index}`;
  const source = (['facebook', 'call', 'ecommerce', 'walk_in'] as const)[index % 4];
  const createdDay = 28 - (index % 14);
  const createdAt = `2024-05-${String(createdDay).padStart(2, '0')}T09:${String(index % 60).padStart(2, '0')}:00.000Z`;
  const assignedAgentName =
    index % 7 === 0 ? undefined : overrides.assignedAgentName ?? AGENTS[index % AGENTS.length];

  const base: LeadListItem = {
    id: `lead-${index}`,
    leadNumber,
    name: overrides.name,
    phone: `01${String(710000000 + index).slice(0, 9)}`,
    email: overrides.email ?? `${overrides.name.split(' ')[0].toLowerCase()}@email.com`,
    source: overrides.source ?? source,
    status: overrides.status,
    assignedAgentName,
    area: overrides.area ?? AREAS[index % AREAS.length],
    estimatedValue: overrides.estimatedValue ?? 3000 + index * 500,
    campaignName: overrides.campaignName ?? CAMPAIGNS[index % CAMPAIGNS.length],
    createdAt,
    lastActivityAt: overrides.lastActivityAt ?? createdAt,
  };

  const activities: LeadDetail['activities'] = [
    {
      id: `${base.id}-a1`,
      type: 'created',
      label: 'Lead created',
      description: `Captured via ${base.source}`,
      timestamp: base.createdAt,
      actorName: 'System',
    },
  ];

  if (assignedAgentName) {
    activities.push({
      id: `${base.id}-a2`,
      type: 'assigned',
      label: 'Assigned to agent',
      description: assignedAgentName,
      timestamp: base.createdAt,
      actorName: 'Team Leader',
    });
  }

  if (['contacted', 'qualified', 'converted'].includes(base.status)) {
    activities.push({
      id: `${base.id}-a3`,
      type: 'call',
      label: 'Outbound call',
      description: 'Customer interested in product details',
      timestamp: base.lastActivityAt ?? base.createdAt,
      actorName: assignedAgentName,
    });
  }

  if (base.status === 'converted') {
    activities.push({
      id: `${base.id}-a4`,
      type: 'converted',
      label: 'Converted to order',
      description: `ORD-${1000 + index}`,
      timestamp: base.lastActivityAt ?? base.createdAt,
      actorName: assignedAgentName,
    });
  }

  return {
    ...base,
    notes: index % 5 === 0 ? 'Requested callback after 6 PM.' : undefined,
    tags: index % 3 === 0 ? ['Hot', 'Repeat'] : index % 4 === 0 ? ['VIP'] : [],
    activities,
    companyName: index % 4 === 0 ? 'Akash Traders' : undefined,
    orderId: base.status === 'converted' ? `ORD-${1000 + index}` : undefined,
    convertedAt: base.status === 'converted' ? base.lastActivityAt : undefined,
  };
}

export const MOCK_LEADS: LeadDetail[] = [
  buildLead(1, { name: 'Rahim Uddin', status: 'new' }),
  buildLead(2, { name: 'Fatema Akter', status: 'new', source: 'facebook' }),
  buildLead(3, { name: 'Karim Hassan', status: 'new', assignedAgentName: undefined }),
  buildLead(4, { name: 'Nusrat Jahan', status: 'contacted' }),
  buildLead(5, { name: 'Sakib Ahmed', status: 'contacted', source: 'call' }),
  buildLead(6, { name: 'Mitu Rahman', status: 'qualified' }),
  buildLead(7, { name: 'Imran Hossain', status: 'qualified', source: 'ecommerce' }),
  buildLead(8, { name: 'Tania Sultana', status: 'converted' }),
  buildLead(9, { name: 'Arif Mahmud', status: 'converted', source: 'facebook' }),
  buildLead(10, { name: 'Hasan Ali', status: 'lost' }),
  buildLead(11, { name: 'Sabrina Khan', status: 'new', assignedAgentName: undefined }),
  buildLead(12, { name: 'Rafiq Islam', status: 'contacted', source: 'facebook' }),
  buildLead(13, { name: 'Jannatul Ferdous', status: 'new' }),
  buildLead(14, { name: 'Omar Faruk', status: 'qualified' }),
  buildLead(15, { name: 'Priya Das', status: 'new', source: 'ecommerce' }),
  buildLead(16, { name: 'Anika Rahman', status: 'contacted' }),
  buildLead(17, { name: 'Tanvir Hossain', status: 'new', assignedAgentName: undefined }),
  buildLead(18, { name: 'Lamia Akter', status: 'qualified', source: 'call' }),
  buildLead(19, { name: 'Shuvo Das', status: 'converted' }),
  buildLead(20, { name: 'Nadia Islam', status: 'lost', source: 'facebook' }),
];

export function getMockLeadById(leadNumber: string): LeadDetail | undefined {
  return MOCK_LEADS.find(
    (lead) => lead.leadNumber === leadNumber || lead.id === leadNumber,
  );
}

export function filterMockLeads(query: LeadListQuery): LeadListResponse {
  const search = query.search?.trim().toLowerCase() ?? '';
  const allMatching = MOCK_LEADS.filter((lead) => {
    if (query.status === 'unassigned') {
      if (lead.assignedAgentName) {
        return false;
      }
    } else if (query.status && lead.status !== query.status) {
      return false;
    }

    if (query.source && lead.source !== query.source) {
      return false;
    }

    if (!search) {
      return true;
    }

    return (
      lead.leadNumber.toLowerCase().includes(search) ||
      lead.name.toLowerCase().includes(search) ||
      lead.phone.includes(search) ||
      (lead.area?.toLowerCase().includes(search) ?? false) ||
      (lead.campaignName?.toLowerCase().includes(search) ?? false)
    );
  });

  const total = allMatching.length;
  const totalEstimatedValue = allMatching.reduce(
    (sum, lead) => sum + (lead.estimatedValue ?? 0),
    0,
  );
  const unassignedCount = allMatching.filter((lead) => !lead.assignedAgentName).length;

  const start = (query.page - 1) * query.pageSize;
  const pageItems = allMatching.slice(start, start + query.pageSize);

  return {
    items: pageItems.map(({ activities: _a, notes: _n, tags: _t, ...listItem }) => listItem),
    total,
    page: query.page,
    pageSize: query.pageSize,
    summary: {
      count: total,
      totalEstimatedValue,
      unassignedCount,
    },
  };
}

import type {
  CreateLeadPayload,
  LeadDetail,
  LeadLineItem,
  LeadListItem,
  LeadListQuery,
  LeadListResponse,
  LeadPipelineQuery,
  LeadPipelineStats,
  LeadStatus,
} from '@laam/types';

import { LEAD_PIPELINE_TABS } from '@/features/leads/config/lead-status-config';
import { MOCK_PRODUCTS } from '@/features/orders/data/mock-products';

export const LEAD_AGENTS = [
  'Sakib Ahmed',
  'Mitu Rahman',
  'Imran Hossain',
  'Tania Sultana',
  'Arif Mahmud',
];

const AREAS = ['Gulshan', 'Banani', 'Dhanmondi', 'Mirpur', 'Uttara', 'Mohammadpur', 'Bashundhara'];
const CAMPAIGNS = [
  'Ramadan Sale',
  'FB Modhu Ad',
  'Instagram Khejur',
  'WhatsApp Inquiry',
  'Eid Gift Box',
  'Walk-in Stall',
];

export type LeadConvertPrefill = {
  leadId: string;
  leadNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress?: string;
  shippingArea?: string;
  source: LeadListItem['source'];
  orderSource: LeadListItem['source'];
  lineItems?: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    sku?: string;
  }>;
};

export type LeadBulkActionResult = {
  successCount: number;
  failedCount: number;
  message?: string;
};

function seedLineItems(leadId: string, index: number): LeadLineItem[] {
  const product = MOCK_PRODUCTS[index % MOCK_PRODUCTS.length];
  const variation = product.variations[0];
  const qty = 1 + (index % 3);
  return [
    {
      id: `${leadId}-line-1`,
      productName: product.name,
      sku: product.sku,
      quantity: qty,
      unitPrice: variation.unitPrice,
      lineTotal: variation.unitPrice * qty,
    },
  ];
}

function calcEstimatedValue(lineItems: LeadLineItem[], fallback: number) {
  if (lineItems.length === 0) return fallback;
  return lineItems.reduce((sum, line) => sum + line.lineTotal, 0);
}

function productSummary(lineItems: LeadLineItem[]) {
  if (lineItems.length === 0) return undefined;
  const first = lineItems[0].productName;
  if (lineItems.length === 1) return first;
  return `${first} +${lineItems.length - 1}`;
}

function buildLead(
  index: number,
  overrides: Partial<LeadListItem> & Pick<LeadListItem, 'name' | 'status'>,
): LeadDetail {
  const leadNumber = `LD-${2000 + index}`;
  const source = (['facebook', 'call', 'ecommerce', 'walk_in'] as const)[index % 4];
  const createdDay = 28 - (index % 14);
  const createdAt = `2024-05-${String(createdDay).padStart(2, '0')}T09:${String(index % 60).padStart(2, '0')}:00.000Z`;
  const assignedAgentName =
    index % 7 === 0 ? undefined : overrides.assignedAgentName ?? LEAD_AGENTS[index % LEAD_AGENTS.length];
  const lineItems = seedLineItems(`lead-${index}`, index);
  const area = overrides.area ?? AREAS[index % AREAS.length];

  const base: LeadListItem = {
    id: `lead-${index}`,
    leadNumber,
    name: overrides.name,
    phone: `01${String(710000000 + index).slice(0, 9)}`,
    email: overrides.email ?? `${overrides.name.split(' ')[0].toLowerCase()}@email.com`,
    source: overrides.source ?? source,
    status: overrides.status,
    assignedAgentName,
    area,
    estimatedValue: overrides.estimatedValue ?? calcEstimatedValue(lineItems, 3000 + index * 500),
    campaignName: overrides.campaignName ?? CAMPAIGNS[index % CAMPAIGNS.length],
    createdAt,
    lastActivityAt: overrides.lastActivityAt ?? createdAt,
    productSummary: productSummary(lineItems),
    itemCount: lineItems.length,
    hasNotes: index % 5 === 0,
    followUpDue: index % 6 === 0 ? '2024-06-15' : undefined,
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
      description: 'Asked about modhu price and delivery charge',
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
    address: `House ${index + 2}, Road ${index % 12}, ${area}, Dhaka`,
    notes: index % 5 === 0 ? 'Requested callback after 6 PM.' : undefined,
    tags:
      index % 3 === 0
        ? ['Hot', 'Repeat']
        : index % 4 === 0
          ? ['VIP', 'Modhu']
          : index % 5 === 0
            ? ['Ramadan', 'Gift']
            : [],
    lineItems,
    activities,
    orderId: base.status === 'converted' ? `ORD-${1000 + index}` : undefined,
    convertedAt: base.status === 'converted' ? base.lastActivityAt : undefined,
  };
}

const SEED_LEADS: LeadDetail[] = [
  buildLead(1, { name: 'Rahim Uddin', status: 'new' }),
  buildLead(2, { name: 'Fatema Akter', status: 'new', source: 'facebook' }),
  buildLead(3, { name: 'Karim Hassan', status: 'new', assignedAgentName: undefined }),
  buildLead(4, { name: 'Nusrat Jahan', status: 'contacted' }),
  buildLead(5, { name: 'Kabir Hossain', status: 'contacted', source: 'call' }),
  buildLead(6, { name: 'Rokeya Begum', status: 'qualified' }),
  buildLead(7, { name: 'Shamim Ahmed', status: 'qualified', source: 'ecommerce' }),
  buildLead(8, { name: 'Farzana Akter', status: 'converted' }),
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
  ...Array.from({ length: 25 }, (_, offset) => {
    const index = 21 + offset;
    const statuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost'];
    const extraNames = [
      'Mehedi Hasan',
      'Rubaiya Sultana',
      'Asif Khan',
      'Farhana Begum',
      'Kamal Uddin',
      'Noman Ali',
      'Salma Khatun',
      'Ibrahim Hossain',
      'Fatima Begum',
      'Rashed Khan',
      'Priya Saha',
      'Hasan Mahmud',
      'Delwar Hossain',
      'Mousumi Akter',
      'Zahid Khan',
      'Papiya Sultana',
      'Enamul Haque',
      'Shirin Akter',
      'Biplob Das',
      'Nasrin Jahan',
      'Raju Ahmed',
      'Sumaiya Khatun',
      'Habibur Rahman',
      'Tasnim Akter',
      'Mizanur Rahman',
    ];
    return buildLead(index, {
      name: extraNames[offset % extraNames.length],
      status: statuses[index % statuses.length],
      assignedAgentName: index % 6 === 0 ? undefined : undefined,
    });
  }),
];

export const mockLeadStore: LeadDetail[] = [...SEED_LEADS];

function getLeadStore(): LeadDetail[] {
  return mockLeadStore;
}

function appendActivity(lead: LeadDetail, event: Omit<LeadDetail['activities'][number], 'id'>) {
  return [
    ...lead.activities,
    { ...event, id: `${lead.id}-a-${lead.activities.length + 1}` },
  ];
}

function leadDetailToListItem(lead: LeadDetail): LeadListItem {
  const {
    address: _address,
    lineItems,
    activities: _activities,
    tags: _tags,
    companyName: _company,
    orderId: _orderId,
    convertedAt: _convertedAt,
    ...listItem
  } = lead;

  return {
    ...listItem,
    productSummary: productSummary(lineItems),
    itemCount: lineItems.length,
    hasNotes: Boolean(lead.notes?.trim()),
  };
}

function nextLeadIndex(): number {
  return mockLeadStore.reduce((max, lead) => {
    const num = Number.parseInt(lead.leadNumber.replace(/\D/g, ''), 10) || 0;
    return Math.max(max, num);
  }, 2000);
}

export function getMockLeadById(leadNumber: string): LeadDetail | undefined {
  return getLeadStore().find(
    (lead) => lead.leadNumber === leadNumber || lead.id === leadNumber,
  );
}

function filterLeadsForPipeline(query: LeadPipelineQuery = {}): LeadDetail[] {
  return getLeadStore().filter((lead) => {
    if (query.source && lead.source !== query.source) return false;
    if (query.agent && lead.assignedAgentName !== query.agent) return false;
    return true;
  });
}

export function getLeadPipelineStats(query: LeadPipelineQuery = {}): LeadPipelineStats {
  const leads = filterLeadsForPipeline(query);
  const totalCount = leads.length;

  const counts = {
    all: totalCount,
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    lost: 0,
    unassigned: 0,
  } satisfies Record<LeadStatus | 'all' | 'unassigned', number>;

  let totalEstimatedValue = 0;

  for (const lead of leads) {
    counts[lead.status] += 1;
    if (!lead.assignedAgentName) counts.unassigned += 1;
    totalEstimatedValue += lead.estimatedValue ?? 0;
  }

  const stages = LEAD_PIPELINE_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    count: counts[tab.id],
    color: tab.color,
    share: totalCount > 0 ? counts[tab.id] / totalCount : 0,
  }));

  return {
    stages,
    totalCount,
    totalEstimatedValue,
    unassignedCount: counts.unassigned,
    convertedCount: counts.converted,
    conversionRate: totalCount > 0 ? (counts.converted / totalCount) * 100 : 0,
  };
}

export function getLeadStatusCounts(): Record<LeadStatus | 'all' | 'unassigned', number> {
  const stats = getLeadPipelineStats();
  return Object.fromEntries(stats.stages.map((stage) => [stage.id, stage.count])) as Record<
    LeadStatus | 'all' | 'unassigned',
    number
  >;
}

function matchesLeadQuery(lead: LeadDetail, query: LeadListQuery): boolean {
  if (query.status === 'unassigned') {
    if (lead.assignedAgentName) return false;
  } else if (query.status && lead.status !== query.status) {
    return false;
  }

  if (query.source && lead.source !== query.source) {
    return false;
  }

  if (query.agent && lead.assignedAgentName !== query.agent) {
    return false;
  }

  const search = query.search?.trim().toLowerCase() ?? '';
  if (!search) return true;

  return (
    lead.leadNumber.toLowerCase().includes(search) ||
    lead.name.toLowerCase().includes(search) ||
    lead.phone.includes(search) ||
    (lead.area?.toLowerCase().includes(search) ?? false) ||
    (lead.campaignName?.toLowerCase().includes(search) ?? false) ||
    (lead.assignedAgentName?.toLowerCase().includes(search) ?? false) ||
    (lead.productSummary?.toLowerCase().includes(search) ?? false) ||
    lead.lineItems.some((line) => line.productName.toLowerCase().includes(search))
  );
}

export function filterMockLeads(query: LeadListQuery): LeadListResponse {
  const allMatching = getLeadStore().filter((lead) => matchesLeadQuery(lead, query));

  const total = allMatching.length;
  const totalEstimatedValue = allMatching.reduce(
    (sum, lead) => sum + (lead.estimatedValue ?? 0),
    0,
  );
  const unassignedCount = allMatching.filter((lead) => !lead.assignedAgentName).length;

  const start = (query.page - 1) * query.pageSize;
  const pageItems = allMatching.slice(start, start + query.pageSize);

  return {
    items: pageItems.map(leadDetailToListItem),
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

export function createMockLead(payload: CreateLeadPayload): LeadDetail {
  const index = nextLeadIndex() + 1;
  const leadNumber = `LD-${index}`;
  const now = new Date().toISOString();
  const lineItems: LeadLineItem[] = (payload.lineItems ?? []).map((line, itemIndex) => ({
    id: `lead-new-${index}-line-${itemIndex}`,
    productName: line.productName,
    sku: line.sku,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: line.unitPrice * line.quantity,
  }));

  const estimatedValue =
    payload.estimatedValue ?? calcEstimatedValue(lineItems, lineItems[0]?.lineTotal ?? 0);

  const detail: LeadDetail = {
    id: `lead-new-${index}`,
    leadNumber,
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    email: payload.email,
    source: payload.source,
    status: 'new',
    assignedAgentName: payload.assignedAgentName,
    area: payload.area,
    address: payload.address,
    estimatedValue: estimatedValue || undefined,
    campaignName: payload.campaignName,
    createdAt: now,
    lastActivityAt: now,
    productSummary: productSummary(lineItems),
    itemCount: lineItems.length,
    hasNotes: Boolean(payload.notes?.trim()),
    notes: payload.notes,
    tags: payload.tags ?? [],
    lineItems,
    activities: [
      {
        id: `lead-new-${index}-a1`,
        type: 'created',
        label: 'Lead created manually',
        description: `Source: ${payload.source}`,
        timestamp: now,
        actorName: payload.assignedAgentName ?? 'Agent',
      },
    ],
  };

  mockLeadStore.unshift(detail);
  return detail;
}

export function updateMockLead(
  leadId: string,
  patch: Partial<
    Pick<
      LeadDetail,
      'status' | 'assignedAgentName' | 'notes' | 'tags' | 'followUpDue' | 'lineItems' | 'address'
    >
  >,
): LeadDetail | null {
  const index = mockLeadStore.findIndex((l) => l.id === leadId || l.leadNumber === leadId);
  if (index < 0) return null;

  const current = mockLeadStore[index];
  let activities = current.activities;
  const now = new Date().toISOString();

  if (patch.status && patch.status !== current.status) {
    activities = appendActivity(current, {
      type: 'status_change',
      label: `Status → ${patch.status}`,
      timestamp: now,
      actorName: 'Agent',
    });
  }

  if (patch.assignedAgentName && patch.assignedAgentName !== current.assignedAgentName) {
    activities = appendActivity(
      { ...current, activities },
      {
        type: 'assigned',
        label: 'Assigned to agent',
        description: patch.assignedAgentName,
        timestamp: now,
        actorName: 'Team Leader',
      },
    );
  }

  if (patch.notes !== undefined && patch.notes !== current.notes) {
    activities = appendActivity(
      { ...current, activities },
      {
        type: 'note',
        label: 'Note updated',
        description: patch.notes,
        timestamp: now,
        actorName: 'Agent',
      },
    );
  }

  const lineItems = patch.lineItems ?? current.lineItems;
  const estimatedValue = calcEstimatedValue(lineItems, current.estimatedValue ?? 0);

  const updated: LeadDetail = {
    ...current,
    ...patch,
    lineItems,
    estimatedValue,
    productSummary: productSummary(lineItems),
    itemCount: lineItems.length,
    hasNotes: patch.notes !== undefined ? Boolean(patch.notes?.trim()) : current.hasNotes,
    activities,
    lastActivityAt: now,
  };

  mockLeadStore[index] = updated;
  return updated;
}

export function bulkUpdateMockLeads(payload: {
  leadIds: string[];
  status?: LeadStatus;
  assignedAgentName?: string;
  note?: string;
  followUpDue?: string;
}): LeadBulkActionResult {
  let successCount = 0;

  for (const leadId of payload.leadIds) {
    const lead = getMockLeadById(leadId);
    if (!lead) continue;

    const notes = payload.note
      ? lead.notes
        ? `${lead.notes}\n${payload.note}`
        : payload.note
      : lead.notes;

    const updated = updateMockLead(lead.id, {
      status: payload.status,
      assignedAgentName: payload.assignedAgentName,
      notes,
      followUpDue: payload.followUpDue ?? lead.followUpDue,
    });

    if (updated) successCount += 1;
  }

  return {
    successCount,
    failedCount: payload.leadIds.length - successCount,
    message: `Updated ${successCount} lead(s)`,
  };
}

export function buildLeadConvertPrefill(lead: LeadDetail): LeadConvertPrefill {
  return {
    leadId: lead.id,
    leadNumber: lead.leadNumber,
    customerName: lead.name,
    customerPhone: lead.phone,
    customerEmail: lead.email,
    shippingAddress: lead.address,
    shippingArea: lead.area,
    source: lead.source,
    orderSource: lead.source,
    lineItems: lead.lineItems.map((line) => ({
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      sku: line.sku,
    })),
  };
}

export function markLeadConverted(leadId: string, orderNumber: string): LeadDetail | null {
  const lead = getMockLeadById(leadId);
  if (!lead || lead.status === 'converted') return lead ?? null;

  const now = new Date().toISOString();
  const activities = appendActivity(lead, {
    type: 'converted',
    label: 'Converted to order',
    description: orderNumber,
    timestamp: now,
    actorName: lead.assignedAgentName ?? 'Agent',
  });

  const updated: LeadDetail = {
    ...lead,
    status: 'converted',
    orderId: orderNumber,
    convertedAt: now,
    lastActivityAt: now,
    activities,
  };

  const index = mockLeadStore.findIndex((l) => l.id === lead.id);
  mockLeadStore[index] = updated;
  return updated;
}

export const LEAD_CONVERT_STORAGE_KEY = 'laam-lead-convert-prefill';

export function saveLeadConvertPrefill(prefill: LeadConvertPrefill): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(LEAD_CONVERT_STORAGE_KEY, JSON.stringify(prefill));
}

export function loadLeadConvertPrefill(): LeadConvertPrefill | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(LEAD_CONVERT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LeadConvertPrefill) : null;
  } catch {
    return null;
  }
}

export function clearLeadConvertPrefill(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(LEAD_CONVERT_STORAGE_KEY);
}

export const MOCK_LEADS = mockLeadStore;

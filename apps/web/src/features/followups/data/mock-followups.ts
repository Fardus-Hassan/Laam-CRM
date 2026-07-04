import type {
  FollowupDetail,
  FollowupFilterCount,
  FollowupListItem,
  FollowupListQuery,
  FollowupListResponse,
  FollowupQueue,
  FollowupStatus,
  FollowupType,
  UpdateFollowupPayload,
} from '@laam/types';

import { MOCK_PRODUCTS } from '@/features/orders/data/mock-products';
import { CUSTOMER_AGENTS } from '@/features/customers/data/mock-customers';
import { FOLLOWUP_FILTERS } from '@/features/followups/config/followup-filters';

/** Reference "today" for mock filtering — aligns with demo dates in other modules. */
export const MOCK_FOLLOWUP_TODAY = '2026-07-02';

const DISTRICTS = ['Dhaka', 'Chittagong', 'Sylhet', 'Gazipur', 'Narayanganj'];
const AREAS = ['Mirpur', 'Uttara', 'Dhanmondi', 'Gulshan', 'Mohammadpur', 'Gandaria'];

const NAMES = [
  'Labiba Akter',
  'Robiul Awal Robin',
  'Fatema Akter',
  'Karim Hassan',
  'Nusrat Jahan',
  'Kabir Hossain',
  'Rokeya Begum',
  'Shamim Ahmed',
  'Farzana Akter',
  'Anika Rahman',
  'Tanvir Hossain',
  'Lamia Akter',
  'Mehedi Hasan',
  'Rubaiya Sultana',
  'Asif Khan',
  'Farhana Begum',
  'Kamal Uddin',
  'Salma Khatun',
  'Ibrahim Hossain',
  'Fatima Begum',
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
  'Joya Begum',
  'Alamgir Hossain',
  'Rina Das',
  'Sajib Islam',
  'Mahmuda Akter',
  'Parvez Khan',
  'Shahana Begum',
];

const TAGS_POOL = ['VIP', 'Ramadan', 'Modhu', 'Khejur', 'Repeat', 'Gift Buyer', 'COD'];

function recentProducts(index: number): FollowupListItem['recentProducts'] {
  const count = 1 + (index % 2);
  return Array.from({ length: count }, (_, i) => {
    const product = MOCK_PRODUCTS[(index + i) % MOCK_PRODUCTS.length];
    const day = 28 - ((index + i) % 14);
    return {
      orderedAt: `2026-06-${String(day).padStart(2, '0')}T14:00:00.000Z`,
      productName: product.name,
      quantity: 1 + (i % 2),
    };
  });
}

function followupType(index: number): FollowupType {
  if (index % 7 === 0) return 'vip';
  if (index % 4 === 0) return 'repeat';
  return 'listed';
}

function followupStatus(index: number): FollowupStatus {
  if (index % 5 === 0) return 'no_status';
  if (index % 3 === 0) return 'pending';
  if (index % 11 === 0) return 'converted';
  return 'done';
}

function scheduleDate(index: number): string | undefined {
  if (index % 8 === 0) return undefined;
  if (index % 3 === 0) return MOCK_FOLLOWUP_TODAY;
  const day = 1 + (index % 28);
  return `2026-07-${String(day).padStart(2, '0')}`;
}

function buildFollowup(index: number, queue: FollowupQueue): FollowupDetail {
  const district = DISTRICTS[index % DISTRICTS.length];
  const area = AREAS[index % AREAS.length];
  const name = NAMES[index % NAMES.length];
  const createdDay = 12 - (index % 10);
  const createdAt = `2026-06-${String(createdDay).padStart(2, '0')}T10:${String(index % 60).padStart(2, '0')}:00.000Z`;
  const status = followupStatus(index);
  const sched = scheduleDate(index);

  const base: FollowupListItem = {
    id: `followup-${queue}-${index}`,
    queue,
    customerId: `cust-${index}`,
    customerNumber: String(1616000 + index),
    scheduleDate: sched,
    skipped: index % 13 === 0,
    name,
    phone: `01${String(710000000 + index).slice(0, 9)}`,
    address: `House ${index + 2}, ${area}, ${district}`,
    area,
    district,
    followupNotes: index % 4 === 0 ? 'Call after 6pm. Interested in Ajwa khejur.' : undefined,
    customerNotes: index % 5 === 0 ? 'Regular modhu buyer — prefers gift packaging.' : undefined,
    hasFollowupNotes: index % 4 === 0,
    hasCustomerNotes: index % 5 === 0,
    followupStatus: status,
    type: followupType(index),
    recentProducts: recentProducts(index),
    tags: index % 3 === 0 ? [TAGS_POOL[index % TAGS_POOL.length]] : [],
    smsStatus: index % 6 === 0 ? 'sent' : 'not_sent',
    assignedAgentName: CUSTOMER_AGENTS[index % CUSTOMER_AGENTS.length],
    source: (['facebook', 'campaign', 'website', 'landing_page', 'call'] as const)[index % 5],
    createdAt,
  };

  return {
    ...base,
    activities: [
      {
        id: `${base.id}-a1`,
        label: 'Follow-up scheduled',
        description: sched ? `Due ${sched}` : 'No date set',
        timestamp: createdAt,
        actorName: base.assignedAgentName,
      },
      ...(base.hasFollowupNotes
        ? [
            {
              id: `${base.id}-a2`,
              label: 'Follow-up note added',
              description: base.followupNotes,
              timestamp: createdAt,
              actorName: base.assignedAgentName,
            },
          ]
        : []),
    ],
  };
}

export const MOCK_FOLLOWUPS: FollowupDetail[] = [
  ...Array.from({ length: 15 }, (_, i) => buildFollowup(i + 1, 1)),
  ...Array.from({ length: 12 }, (_, i) => buildFollowup(i + 16, 2)),
  ...Array.from({ length: 10 }, (_, i) => buildFollowup(i + 28, 3)),
];

export function createMockFollowupFromOrder(input: {
  orderId: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address?: string;
  district?: string;
  agentName?: string;
  products?: string[];
}): FollowupDetail {
  const now = new Date().toISOString();
  const id = `followup-ord-${input.orderId}`;
  const existing = MOCK_FOLLOWUPS.find((f) => f.id === id);
  if (existing) return existing;

  const item: FollowupDetail = {
    id,
    queue: 1,
    customerId: `cust-phone-${input.phone.replace(/\D/g, '')}`,
    customerNumber: input.orderNumber,
    scheduleDate: MOCK_FOLLOWUP_TODAY,
    skipped: false,
    name: input.customerName,
    phone: input.phone,
    address: input.address ?? '',
    area: input.district,
    district: input.district ?? 'Dhaka',
    followupNotes: `Confirm order ${input.orderNumber}`,
    hasFollowupNotes: true,
    hasCustomerNotes: false,
    followupStatus: 'pending',
    type: 'listed',
    recentProducts: (input.products ?? []).slice(0, 3).map((productName) => ({
      orderedAt: now,
      productName,
      quantity: 1,
    })),
    tags: ['Order'],
    smsStatus: 'not_sent',
    assignedAgentName: input.agentName ?? CUSTOMER_AGENTS[0],
    source: 'call',
    createdAt: now,
    activities: [
      {
        id: `${id}-a1`,
        label: 'Follow-up created from order',
        description: input.orderNumber,
        timestamp: now,
        actorName: input.agentName,
      },
    ],
  };
  MOCK_FOLLOWUPS.unshift(item);
  return item;
}

export function createMockFollowupForCustomer(input: {
  customerId?: string;
  customerNumber?: string;
  name: string;
  phone: string;
  address?: string;
  district?: string;
  agentName?: string;
  note?: string;
}): FollowupDetail {
  const now = new Date().toISOString();
  const id = `followup-cust-${Date.now()}`;
  const item: FollowupDetail = {
    id,
    queue: 1,
    customerId: input.customerId ?? `cust-phone-${input.phone.replace(/\D/g, '')}`,
    customerNumber: input.customerNumber ?? input.phone.slice(-6),
    scheduleDate: MOCK_FOLLOWUP_TODAY,
    skipped: false,
    name: input.name,
    phone: input.phone,
    address: input.address ?? '',
    district: input.district ?? 'Dhaka',
    followupNotes: input.note ?? 'Customer follow-up',
    hasFollowupNotes: true,
    hasCustomerNotes: false,
    followupStatus: 'pending',
    type: 'listed',
    recentProducts: [],
    tags: [],
    smsStatus: 'not_sent',
    assignedAgentName: input.agentName ?? CUSTOMER_AGENTS[0],
    source: 'call',
    createdAt: now,
    activities: [
      {
        id: `${id}-a1`,
        label: 'Follow-up scheduled',
        timestamp: now,
        actorName: input.agentName,
      },
    ],
  };
  MOCK_FOLLOWUPS.unshift(item);
  return item;
}

export function getMockFollowupById(id: string): FollowupDetail | undefined {
  return MOCK_FOLLOWUPS.find((f) => f.id === id);
}

export function getTodayFollowupCount(): number {
  return MOCK_FOLLOWUPS.filter(
    (f) => f.scheduleDate === MOCK_FOLLOWUP_TODAY && !f.skipped,
  ).length;
}

export function updateMockFollowup(
  id: string,
  patch: UpdateFollowupPayload,
): FollowupDetail | undefined {
  const index = MOCK_FOLLOWUPS.findIndex((f) => f.id === id);
  if (index === -1) return undefined;
  const current = MOCK_FOLLOWUPS[index];
  const updated: FollowupDetail = {
    ...current,
    ...patch,
    hasFollowupNotes:
      patch.followupNotes !== undefined
        ? Boolean(patch.followupNotes.trim())
        : current.hasFollowupNotes,
    hasCustomerNotes:
      patch.customerNotes !== undefined
        ? Boolean(patch.customerNotes.trim())
        : current.hasCustomerNotes,
    tags: patch.tags ?? current.tags,
  };
  MOCK_FOLLOWUPS[index] = updated;
  return updated;
}

export function bulkUpdateMockFollowups(payload: {
  followupIds: string[];
  scheduleDate?: string;
  followupStatus?: FollowupStatus;
  assignedAgentName?: string;
  tags?: string[];
  note?: string;
}): { successCount: number; failedCount: number } {
  let successCount = 0;
  let failedCount = 0;
  for (const id of payload.followupIds) {
    const patch: UpdateFollowupPayload = {};
    if (payload.scheduleDate) patch.scheduleDate = payload.scheduleDate;
    if (payload.followupStatus) patch.followupStatus = payload.followupStatus;
    if (payload.assignedAgentName) patch.assignedAgentName = payload.assignedAgentName;
    if (payload.tags) patch.tags = payload.tags;
    if (payload.note) patch.followupNotes = payload.note;
    const result = updateMockFollowup(id, patch);
    if (result) successCount++;
    else failedCount++;
  }
  return { successCount, failedCount };
}

function isToday(item: FollowupListItem): boolean {
  return item.scheduleDate === MOCK_FOLLOWUP_TODAY && !item.skipped;
}

function computeFilters(all: FollowupListItem[]): FollowupFilterCount[] {
  return FOLLOWUP_FILTERS.map((f) => {
    let count = all.length;
    if (f.id === 'today') count = all.filter(isToday).length;
    if (f.id === 'no_status') count = all.filter((i) => i.followupStatus === 'no_status').length;
    return { id: f.id, label: f.label, count };
  });
}

export function filterMockFollowups(query: FollowupListQuery): FollowupListResponse {
  const search = query.search?.trim().toLowerCase() ?? '';
  const queueItems = MOCK_FOLLOWUPS.filter((f) => f.queue === query.queue);

  const allMatching = queueItems.filter((item) => {
    if (query.filter === 'today' && !isToday(item)) return false;
    if (query.filter === 'no_status' && item.followupStatus !== 'no_status') return false;

    if (!search) return true;
    return (
      item.name.toLowerCase().includes(search) ||
      item.phone.includes(search) ||
      (item.address?.toLowerCase().includes(search) ?? false) ||
      item.customerNumber.includes(search) ||
      item.recentProducts.some((p) => p.productName.toLowerCase().includes(search))
    );
  });

  const listItems = allMatching.map(({ activities: _a, ...listItem }) => listItem);
  const total = listItems.length;
  const start = (query.page - 1) * query.pageSize;
  const pageItems = listItems.slice(start, start + query.pageSize);

  return {
    items: pageItems,
    total,
    page: query.page,
    pageSize: query.pageSize,
    summary: {
      count: total,
      todayCount: listItems.filter(isToday).length,
      noStatusCount: listItems.filter((i) => i.followupStatus === 'no_status').length,
      queueCount: queueItems.length,
    },
    filters: computeFilters(queueItems.map(({ activities: _a, ...li }) => li)),
  };
}

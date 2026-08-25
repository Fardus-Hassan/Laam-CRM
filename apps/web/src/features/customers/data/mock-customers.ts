import type {
  CustomerDetail,
  CustomerListItem,
  CustomerListQuery,
  CustomerListResponse,
  CustomerSegmentCount,
  CustomerStatus,
} from '@laam/types';

import { MOCK_PURCHASE_SEGMENTS } from '@/features/customers/data/mock-purchase-segments';
import { MOCK_PRODUCTS } from '@/features/orders/data/mock-products';

const MOCK_SEGMENTS: Array<{ id: string; label: string; match: (c: CustomerDetail) => boolean }> = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'new', label: 'New', match: (c) => c.orderCount < 2 },
  { id: 'repeat', label: 'Repeat', match: (c) => c.orderCount >= 2 },
  { id: 'follow_up', label: 'Follow-up', match: (c) => Boolean(c.hasFollowUp) },
  {
    id: 'high_risk',
    label: 'At risk',
    match: (c) => c.courierScore.failed >= 2 && c.orderCount >= 2,
  },
];

import { getAgentNames } from '@/features/rbac/data/agent-names';

export const CUSTOMER_AGENTS = getAgentNames();

const DISTRICTS = ['Dhaka', 'Chittagong', 'Sylhet', 'Gazipur', 'Narayanganj', 'Cumilla'];
const AREAS = ['Mirpur', 'Uttara', 'Dhanmondi', 'Banani', 'Gulshan', 'Mohammadpur', 'Agrabad', 'Panchlaish'];

const CONSUMER_NAMES = [
  'Rahim Uddin',
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
  'Liton Das',
];

function courierScore(total: number, failed: number): CustomerListItem['courierScore'] {
  const success = Math.max(0, total - failed);
  const rate = total > 0 ? Math.round((success / total) * 100) : 100;
  return { total, success, failed, rate };
}

function recentProducts(index: number): CustomerListItem['recentProducts'] {
  const count = 1 + (index % 3);
  return Array.from({ length: count }, (_, i) => {
    const product = MOCK_PRODUCTS[(index + i) % MOCK_PRODUCTS.length];
    const day = 28 - ((index + i) % 14);
    return {
      orderedAt: `2024-06-${String(day).padStart(2, '0')}T14:00:00.000Z`,
      productName: product.name,
      quantity: 1 + (i % 2),
    };
  });
}

function statusFromOrders(orders: number): CustomerStatus {
  if (orders >= 10) return '10_time';
  if (orders >= 5) return '5_time';
  if (orders === 3) return '3_time';
  if (orders === 2) return '2_time';
  if (orders >= 4) return 'repeat';
  return 'none';
}

function buildCustomer(index: number, overrides: Partial<CustomerListItem> = {}): CustomerDetail {
  const orderCount = overrides.orderCount ?? 1 + (index % 12);
  const failed = index % 7 === 0 ? 2 : index % 5 === 0 ? 1 : 0;
  const deliveredCount = overrides.deliveredCount ?? Math.max(0, orderCount - failed);
  const district = overrides.district ?? DISTRICTS[index % DISTRICTS.length];
  const area = overrides.area ?? AREAS[index % AREAS.length];
  const createdDay = 28 - (index % 20);
  const createdAt = `2024-05-${String(createdDay).padStart(2, '0')}T08:00:00.000Z`;
  const name = overrides.name ?? CONSUMER_NAMES[index % CONSUMER_NAMES.length];
  const totalSpent = overrides.totalSpent ?? orderCount * (650 + (index % 5) * 180);

  const base: CustomerListItem = {
    id: `cust-${index}`,
    customerNumber: String(1616000 + index),
    name,
    phone: overrides.phone ?? `01${String(710000000 + index).slice(0, 9)}`,
    email: overrides.email ?? `${name.split(' ')[0].toLowerCase()}@gmail.com`,
    area,
    district,
    address: overrides.address ?? `House ${index + 2}, Road ${index % 8}, ${area}, ${district}`,
    createdAt,
    orderCount,
    deliveredCount,
    totalSpent,
    courierScore: overrides.courierScore ?? courierScore(orderCount, failed),
    courierShop: overrides.courierShop ?? { to: orderCount, co: deliveredCount },
    recentProducts: overrides.recentProducts ?? recentProducts(index),
    tags:
      overrides.tags ??
      (index % 4 === 0
        ? ['VIP', 'Modhu']
        : index % 5 === 0
          ? ['Khejur', 'Ramadan']
          : index % 6 === 0
            ? ['Gift Buyer']
            : []),
    status: overrides.status ?? (index % 9 === 0 ? 'premium' : statusFromOrders(orderCount)),
    hasNotes: index % 4 === 0,
    lastNotePreview:
      index % 4 === 0 ? 'Prefers evening call. COD regular buyer.' : undefined,
    hasFollowUp: index % 6 === 0,
    followUpDue: index % 6 === 0 ? '2024-06-20' : undefined,
    assignedAgentName: overrides.assignedAgentName ?? CUSTOMER_AGENTS[index % CUSTOMER_AGENTS.length],
    lastOrderAt: `2024-06-${String(15 - (index % 10)).padStart(2, '0')}T11:00:00.000Z`,
  };

  return {
    ...base,
    notes: base.hasNotes ? 'Prefers evening call. COD regular buyer.' : undefined,
    activities: [
      ...(base.hasNotes
        ? [
            {
              id: `${base.id}-note`,
              label: 'Note updated',
              description: 'Prefers evening call. COD regular buyer.',
              timestamp: base.createdAt,
              actorName: base.assignedAgentName,
            },
          ]
        : []),
      {
        id: `${base.id}-a1`,
        label: 'Customer joined',
        timestamp: base.createdAt,
      },
      ...(base.orderCount > 0
        ? [
            {
              id: `${base.id}-a2`,
              label: `Placed ${base.orderCount} order(s)`,
              description: base.recentProducts[0]?.productName,
              timestamp: base.lastOrderAt ?? base.createdAt,
            },
          ]
        : []),
    ],
  };
}

const SEED: CustomerDetail[] = [
  buildCustomer(1, { orderCount: 6, status: 'repeat', tags: ['VIP', 'Modhu'] }),
  buildCustomer(2, { orderCount: 2, status: '2_time' }),
  buildCustomer(3, { orderCount: 3, status: '3_time', tags: ['Khejur'] }),
  buildCustomer(4, { orderCount: 1, status: 'none', deliveredCount: 0, courierScore: courierScore(1, 1) }),
  buildCustomer(5, { orderCount: 8, status: 'premium', tags: ['VIP', 'Repeat'] }),
  buildCustomer(6, { orderCount: 5, status: '5_time' }),
  buildCustomer(7, { orderCount: 10, status: '10_time', tags: ['VIP'] }),
  buildCustomer(8, { orderCount: 2, status: '2_time', hasFollowUp: true }),
  buildCustomer(9, { orderCount: 4, status: 'repeat', tags: ['Ramadan'] }),
  buildCustomer(10, { orderCount: 1, status: 'none' }),
  ...Array.from({ length: 30 }, (_, offset) => buildCustomer(11 + offset)),
];

export const mockCustomerStore: CustomerDetail[] = [...SEED];

function getStore(): CustomerDetail[] {
  return mockCustomerStore;
}

export function getMockCustomerById(id: string): CustomerDetail | undefined {
  const normalized = id.startsWith('company-') ? id.replace('company-', 'cust-') : id;
  return getStore().find(
    (c) =>
      c.id === normalized ||
      c.id === id ||
      c.customerNumber === id ||
      c.customerNumber === id.replace(/\D/g, ''),
  );
}

function matchesSegment(customer: CustomerDetail, segmentId?: string): boolean {
  if (!segmentId || segmentId === 'all') return true;
  const behavioral = MOCK_SEGMENTS.find((s) => s.id === segmentId);
  if (behavioral) return behavioral.match(customer);
  const purchase = MOCK_PURCHASE_SEGMENTS.find((s) => s.slug === segmentId);
  if (!purchase) return true;
  const value =
    purchase.metric === 'orderCount' ? customer.orderCount : customer.deliveredCount;
  return compareOp(value, purchase.op, purchase.threshold);
}

function compareOp(n: number, op: string | undefined, v: number): boolean {
  const o = op ?? 'gte';
  if (o === 'eq') return n === v;
  if (o === 'gte') return n >= v;
  if (o === 'lte') return n <= v;
  if (o === 'gt') return n > v;
  if (o === 'lt') return n < v;
  return true;
}

function dayStart(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function matchesQuery(customer: CustomerDetail, query: CustomerListQuery): boolean {
  if (!matchesSegment(customer, query.segment)) return false;
  if (query.status && customer.status !== query.status) return false;
  if (query.district && !(customer.district ?? '').toLowerCase().includes(query.district.toLowerCase())) {
    return false;
  }
  if (
    query.employee &&
    !(customer.assignedAgentName ?? '').toLowerCase().includes(query.employee.toLowerCase())
  ) {
    return false;
  }
  if (query.customerTag && !customer.tags.some((t) => t === query.customerTag)) {
    return false;
  }
  if (query.orderCount !== undefined) {
    if (!compareOp(customer.orderCount, query.orderCountOp, query.orderCount)) return false;
  }
  if (query.deliveredCount !== undefined) {
    if (!compareOp(customer.deliveredCount, query.deliveredCountOp, query.deliveredCount)) {
      return false;
    }
  }
  if (query.courierScoreMin !== undefined && customer.courierScore.rate < query.courierScoreMin) {
    return false;
  }
  if (query.amountMin !== undefined && customer.totalSpent < query.amountMin) return false;
  if (query.amountMax !== undefined && customer.totalSpent > query.amountMax) return false;

  const createdFrom = dayStart(query.createdFrom);
  const createdTo = dayStart(query.createdTo);
  const createdAt = new Date(customer.createdAt).getTime();
  if (createdFrom !== null && createdAt < createdFrom) return false;
  if (createdTo !== null && createdAt > createdTo) return false;

  const lastFrom = dayStart(query.lastOrderFrom);
  const lastTo = dayStart(query.lastOrderTo);
  const lastAt = customer.lastOrderAt ? new Date(customer.lastOrderAt).getTime() : null;
  if (lastFrom !== null || lastTo !== null) {
    if (lastAt === null) return false;
    if (lastFrom !== null && lastAt < lastFrom) return false;
    if (lastTo !== null && lastAt > lastTo) return false;
  }

  if (query.followupStatus === 'pending' && !customer.hasFollowUp) return false;
  if (query.followupStatus === 'none' && customer.hasFollowUp) return false;
  if (query.followupStatus === 'overdue') {
    if (!customer.hasFollowUp || !customer.followUpDue) return false;
    if (new Date(customer.followUpDue).getTime() >= Date.now()) return false;
  }

  const fuFrom = dayStart(query.followupFrom);
  const fuTo = dayStart(query.followupTo);
  if (fuFrom !== null || fuTo !== null) {
    if (!customer.followUpDue) return false;
    const due = new Date(customer.followUpDue).getTime();
    if (fuFrom !== null && due < fuFrom) return false;
    if (fuTo !== null && due > fuTo) return false;
  }

  if (query.product) {
    const hasProduct = customer.recentProducts.some((p) =>
      p.productName.toLowerCase().includes(query.product!.toLowerCase()),
    );
    if (query.productExclude ? hasProduct : !hasProduct) return false;
  }

  const search = query.search?.trim().toLowerCase() ?? '';
  if (!search) return true;

  return (
    customer.customerNumber.includes(search) ||
    customer.name.toLowerCase().includes(search) ||
    customer.phone.includes(search) ||
    (customer.area?.toLowerCase().includes(search) ?? false) ||
    (customer.district?.toLowerCase().includes(search) ?? false) ||
    customer.recentProducts.some((p) => p.productName.toLowerCase().includes(search)) ||
    customer.tags.some((t) => t.toLowerCase().includes(search))
  );
}

export function getCustomerSegmentCounts(): CustomerSegmentCount[] {
  const store = getStore();
  return MOCK_SEGMENTS.map((segment) => ({
    id: segment.id,
    label: segment.label,
    count: store.filter((c) => matchesSegment(c, segment.id)).length,
  }));
}

export function filterMockCustomers(query: CustomerListQuery): CustomerListResponse {
  const allMatching = getStore().filter((c) => matchesQuery(c, query));
  const total = allMatching.length;
  const totalSpent = allMatching.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgCourierRate =
    allMatching.length > 0
      ? allMatching.reduce((sum, c) => sum + c.courierScore.rate, 0) / allMatching.length
      : 0;
  const withFollowUpCount = allMatching.filter((c) => c.hasFollowUp).length;

  const start = (query.page - 1) * query.pageSize;
  const pageItems = allMatching.slice(start, start + query.pageSize);
  const store = getStore();

  return {
    items: pageItems.map(({ notes: _n, activities: _a, ...listItem }) => listItem),
    total,
    page: query.page,
    pageSize: query.pageSize,
    summary: {
      count: total,
      totalSpent,
      avgCourierRate,
      withFollowUpCount,
    },
    segments: getCustomerSegmentCounts(),
    purchaseSegments: MOCK_PURCHASE_SEGMENTS.filter(
      (s) =>
        s.isActive &&
        (s.displayMode === 'nested_tab' || s.displayMode === 'sidebar_and_tab'),
    ).map((segment) => ({
      id: segment.slug,
      label: segment.label,
      count: store.filter((c) => matchesSegment(c, segment.slug)).length,
    })),
    statuses: [
      {
        id: 'none',
        label: 'No status',
        count: store.filter((c) => c.status === 'none').length,
      },
      {
        id: 'premium',
        label: 'Premium',
        count: store.filter((c) => c.status === 'premium').length,
      },
    ],
  };
}

export function getMockCustomerByPhone(phone: string): CustomerDetail | undefined {
  const digits = phone.replace(/\D/g, '');
  return getStore().find((c) => c.phone.replace(/\D/g, '') === digits);
}

export function upsertMockCustomerFromOrder(input: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  district?: string;
  amount: number;
  productNames: string[];
  agentName?: string;
}): CustomerDetail {
  const existing = getMockCustomerByPhone(input.phone);
  const now = new Date().toISOString();
  const products = input.productNames.slice(0, 3).map((productName) => ({
    orderedAt: now,
    productName,
    quantity: 1,
  }));

  if (existing) {
    const orderCount = existing.orderCount + 1;
    const updated: CustomerDetail = {
      ...existing,
      name: input.name || existing.name,
      email: input.email ?? existing.email,
      address: input.address ?? existing.address,
      district: input.district ?? existing.district,
      orderCount,
      totalSpent: existing.totalSpent + input.amount,
      status: statusFromOrders(orderCount),
      lastOrderAt: now,
      recentProducts: [...products, ...existing.recentProducts].slice(0, 5),
      assignedAgentName: input.agentName ?? existing.assignedAgentName,
      activities: [
        {
          id: `${existing.id}-ord-${Date.now()}`,
          label: 'Placed an order',
          description: input.productNames[0],
          timestamp: now,
        },
        ...existing.activities,
      ],
    };
    const index = mockCustomerStore.findIndex((c) => c.id === existing.id);
    if (index >= 0) mockCustomerStore[index] = updated;
    return updated;
  }

  const id = `cust-imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const digits = input.phone.replace(/\D/g, '');
  const phone = digits.startsWith('0') ? digits : `0${digits}`;
  const customer: CustomerDetail = {
    id,
    customerNumber: String(1700000 + mockCustomerStore.length),
    name: input.name,
    phone: phone.slice(0, 11) || input.phone,
    email: input.email,
    area: input.district,
    district: input.district ?? 'Dhaka',
    address: input.address ?? '',
    createdAt: now,
    orderCount: 1,
    deliveredCount: 0,
    totalSpent: input.amount,
    courierScore: courierScore(1, 0),
    recentProducts: products,
    tags: ['Imported'],
    status: 'none',
    hasNotes: false,
    hasFollowUp: false,
    assignedAgentName: input.agentName ?? CUSTOMER_AGENTS[0],
    lastOrderAt: now,
    activities: [
      { id: `${id}-a1`, label: 'Customer created from order', timestamp: now },
    ],
  };
  mockCustomerStore.unshift(customer);
  return customer;
}

export function upsertMockCustomerFromImport(input: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  district?: string;
  tags?: string;
  notes?: string;
}): CustomerDetail {
  const existing = getMockCustomerByPhone(input.phone);
  const tags = input.tags
    ? input.tags.split(/[;,]/).map((t) => t.trim()).filter(Boolean)
    : ['Imported'];

  if (existing) {
    const updated: CustomerDetail = {
      ...existing,
      name: input.name || existing.name,
      email: input.email ?? existing.email,
      address: input.address ?? existing.address,
      district: input.district ?? existing.district,
      tags: [...new Set([...existing.tags, ...tags])],
      notes: input.notes ?? existing.notes,
      hasNotes: Boolean(input.notes ?? existing.notes),
      lastNotePreview: (input.notes ?? existing.notes)?.trim() || undefined,
    };
    const index = mockCustomerStore.findIndex((c) => c.id === existing.id);
    if (index >= 0) mockCustomerStore[index] = updated;
    return updated;
  }

  return upsertMockCustomerFromOrder({
    name: input.name,
    phone: input.phone,
    email: input.email,
    address: input.address,
    district: input.district,
    amount: 0,
    productNames: [],
  });
}

export function restoreMockCustomer(snapshot: CustomerDetail): void {
  if (mockCustomerStore.some((c) => c.id === snapshot.id)) return;
  mockCustomerStore.unshift(snapshot);
}

export function findDuplicatePhones(): { phone: string; customers: CustomerDetail[] }[] {
  const byPhone = new Map<string, CustomerDetail[]>();
  for (const c of mockCustomerStore) {
    const phone = c.phone.replace(/\D/g, '');
    const list = byPhone.get(phone) ?? [];
    list.push(c);
    byPhone.set(phone, list);
  }
  return [...byPhone.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([phone, customers]) => ({ phone, customers }))
    .sort((a, b) => b.customers.length - a.customers.length);
}

export function mergeCustomers(primaryId: string, duplicateIds: string[]): CustomerDetail | null {
  const primary = getMockCustomerById(primaryId);
  if (!primary) return null;

  const duplicates = duplicateIds
    .map((id) => getMockCustomerById(id))
    .filter((c): c is CustomerDetail => c != null && c.id !== primary.id);

  let orderCount = primary.orderCount;
  let totalSpent = primary.totalSpent;
  let deliveredCount = primary.deliveredCount;
  const tags = new Set(primary.tags);
  const products = [...primary.recentProducts];

  for (const dup of duplicates) {
    orderCount += dup.orderCount;
    totalSpent += dup.totalSpent;
    deliveredCount += dup.deliveredCount;
    dup.tags.forEach((t) => tags.add(t));
    products.push(...dup.recentProducts);
  }

  const merged: CustomerDetail = {
    ...primary,
    orderCount,
    totalSpent,
    deliveredCount,
    tags: [...tags],
    recentProducts: products.slice(0, 8),
    status: statusFromOrders(orderCount),
    notes: [primary.notes, ...duplicates.map((d) => d.notes).filter(Boolean)]
      .filter(Boolean)
      .join('\n'),
    hasNotes: true,
    lastNotePreview: [primary.notes, ...duplicates.map((d) => d.notes).filter(Boolean)]
      .filter(Boolean)
      .join('\n')
      .trim() || undefined,
    activities: [
      {
        id: `${primary.id}-merge-${Date.now()}`,
        label: `Merged ${duplicates.length} duplicate profile(s)`,
        timestamp: new Date().toISOString(),
      },
      ...primary.activities,
    ],
  };

  const index = mockCustomerStore.findIndex((c) => c.id === primary.id);
  if (index >= 0) mockCustomerStore[index] = merged;

  const removeIds = new Set(duplicates.map((d) => d.id));
  for (let i = mockCustomerStore.length - 1; i >= 0; i--) {
    if (removeIds.has(mockCustomerStore[i].id)) {
      mockCustomerStore.splice(i, 1);
    }
  }

  return merged;
}

export function updateMockCustomer(
  customerId: string,
  patch: Partial<Pick<CustomerDetail, 'notes' | 'tags' | 'status' | 'hasFollowUp' | 'followUpDue' | 'assignedAgentName'>>,
): CustomerDetail | null {
  const index = mockCustomerStore.findIndex((c) => c.id === customerId || c.customerNumber === customerId);
  if (index < 0) return null;

  const notes =
    patch.notes !== undefined ? patch.notes : mockCustomerStore[index].notes;
  const prev = mockCustomerStore[index];
  const noteChanged =
    patch.notes !== undefined && patch.notes !== (prev.notes ?? '');
  const activities = noteChanged
    ? [
        {
          id: `${prev.id}-note-${Date.now()}`,
          label: 'Note updated',
          description: notes?.trim() || undefined,
          timestamp: new Date().toISOString(),
        },
        ...prev.activities,
      ]
    : prev.activities;
  const updated: CustomerDetail = {
    ...prev,
    ...patch,
    notes,
    hasNotes: Boolean(notes?.trim()),
    lastNotePreview: notes?.trim() || undefined,
    activities,
  };
  mockCustomerStore[index] = updated;
  return updated;
}

export function bulkUpdateMockCustomers(payload: {
  customerIds: string[];
  note?: string;
  status?: CustomerStatus;
  assignedAgentName?: string;
  followUpDue?: string;
}): { successCount: number; failedCount: number } {
  let successCount = 0;
  for (const id of payload.customerIds) {
    const customer = getMockCustomerById(id);
    if (!customer) continue;
    const notes = payload.note
      ? customer.notes
        ? `${customer.notes}\n${payload.note}`
        : payload.note
      : customer.notes;
    const updated = updateMockCustomer(customer.id, {
      notes,
      status: payload.status,
      assignedAgentName: payload.assignedAgentName,
      followUpDue: payload.followUpDue,
      hasFollowUp: payload.followUpDue ? true : customer.hasFollowUp,
    });
    if (updated) successCount += 1;
  }
  return { successCount, failedCount: payload.customerIds.length - successCount };
}

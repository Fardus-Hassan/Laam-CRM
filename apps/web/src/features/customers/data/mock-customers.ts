import type {
  CustomerDetail,
  CustomerListItem,
  CustomerListQuery,
  CustomerListResponse,
  CustomerSegmentCount,
  CustomerStatus,
} from '@laam/types';

import { MOCK_PRODUCTS } from '@/features/orders/data/mock-products';
import { CUSTOMER_SEGMENTS } from '@/features/customers/config/customer-segments';

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
    hasFollowUp: index % 6 === 0,
    followUpDue: index % 6 === 0 ? '2024-06-20' : undefined,
    assignedAgentName: overrides.assignedAgentName ?? CUSTOMER_AGENTS[index % CUSTOMER_AGENTS.length],
    lastOrderAt: `2024-06-${String(15 - (index % 10)).padStart(2, '0')}T11:00:00.000Z`,
  };

  return {
    ...base,
    notes: base.hasNotes ? 'Prefers evening call. COD regular buyer.' : undefined,
    activities: [
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
  const segment = CUSTOMER_SEGMENTS.find((s) => s.id === segmentId);
  if (!segment) return true;

  if (segment.status && customer.status !== segment.status) return false;
  if (segment.tag && !customer.tags.includes(segment.tag)) return false;
  if (segment.minOrders !== undefined && customer.orderCount < segment.minOrders) return false;
  if (segment.maxOrders !== undefined && customer.orderCount > segment.maxOrders) return false;
  if (segment.id === 'no_status' && customer.status !== 'none') return false;
  if (segment.id === 'has_followup' && !customer.hasFollowUp) return false;
  return true;
}

function matchesQuery(customer: CustomerDetail, query: CustomerListQuery): boolean {
  if (!matchesSegment(customer, query.segment)) return false;
  if (query.status && customer.status !== query.status) return false;
  if (query.district && customer.district !== query.district) return false;

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
  return CUSTOMER_SEGMENTS.map((segment) => ({
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

  const updated: CustomerDetail = {
    ...mockCustomerStore[index],
    ...patch,
    hasNotes: patch.notes !== undefined ? Boolean(patch.notes?.trim()) : mockCustomerStore[index].hasNotes,
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

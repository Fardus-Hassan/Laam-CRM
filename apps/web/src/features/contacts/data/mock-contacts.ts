import type {
  ContactDetail,
  ContactListItem,
  ContactListQuery,
  ContactListResponse,
  ContactSegmentCount,
  ContactType,
  CreateContactPayload,
} from '@laam/types';

import { MOCK_PRODUCTS } from '@/features/orders/data/mock-products';
import { CONTACT_SEGMENTS } from '@/features/contacts/config/contact-segments';

export const CONTACT_AGENTS = [
  'Sakib Ahmed',
  'Mitu Rahman',
  'Imran Hossain',
  'Tania Sultana',
  'Arif Mahmud',
];

const DISTRICTS = ['Dhaka', 'Chittagong', 'Sylhet', 'Gazipur', 'Narayanganj', 'Cumilla'];
const AREAS = ['Mirpur', 'Uttara', 'Dhanmondi', 'Banani', 'Gulshan', 'Mohammadpur', 'Agrabad'];

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
];

function courierScore(total: number, failed: number): ContactListItem['courierScore'] {
  const success = Math.max(0, total - failed);
  const rate = total > 0 ? Math.round((success / total) * 100) : 100;
  return { total, success, failed, rate };
}

function recentProducts(index: number): ContactListItem['recentProducts'] {
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

function buildCustomerContact(
  index: number,
  overrides: Partial<ContactListItem> = {},
): ContactDetail {
  const orderCount = overrides.orderCount ?? 1 + (index % 12);
  const failed = index % 7 === 0 ? 2 : index % 5 === 0 ? 1 : 0;
  const deliveredCount = overrides.deliveredCount ?? Math.max(0, orderCount - failed);
  const district = overrides.district ?? DISTRICTS[index % DISTRICTS.length];
  const area = overrides.area ?? AREAS[index % AREAS.length];
  const createdDay = 28 - (index % 20);
  const createdAt = `2024-05-${String(createdDay).padStart(2, '0')}T08:00:00.000Z`;
  const name = overrides.name ?? CONSUMER_NAMES[index % CONSUMER_NAMES.length];
  const source = (['facebook', 'call', 'ecommerce', 'walk_in'] as const)[index % 4];
  const totalSpent = overrides.totalSpent ?? orderCount * (650 + (index % 5) * 180);

  const base: ContactListItem = {
    id: `contact-cust-${index}`,
    contactNumber: String(1616000 + index),
    name,
    phone: overrides.phone ?? `01${String(710000000 + index).slice(0, 9)}`,
    email: overrides.email ?? `${name.split(' ')[0].toLowerCase()}@gmail.com`,
    contactType: 'customer',
    source: overrides.source ?? source,
    area,
    district,
    address: overrides.address ?? `House ${index + 2}, Road ${index % 8}, ${area}, ${district}`,
    assignedAgentName: overrides.assignedAgentName ?? CONTACT_AGENTS[index % CONTACT_AGENTS.length],
    lastContactAt: overrides.lastContactAt ?? `2024-06-${String(20 - (index % 10)).padStart(2, '0')}T10:00:00.000Z`,
    createdAt,
    orderCount,
    deliveredCount,
    totalSpent,
    courierScore: overrides.courierScore ?? courierScore(orderCount, failed),
    recentProducts: overrides.recentProducts ?? recentProducts(index),
    tags: overrides.tags ?? (index % 4 === 0 ? ['VIP', 'Repeat'] : index % 3 === 0 ? ['Ramadan'] : []),
    hasNotes: overrides.hasNotes ?? index % 5 === 0,
    hasFollowUp: overrides.hasFollowUp ?? index % 8 === 0,
    followUpDue: overrides.followUpDue ?? (index % 8 === 0 ? '2024-07-05' : undefined),
    customerId: overrides.customerId ?? `cust-${index}`,
    leadId: index % 3 === 0 ? `lead-${index}` : undefined,
  };

  return {
    ...base,
    notes: base.hasNotes ? 'Prefers WhatsApp. Often orders modhu gift box for relatives.' : undefined,
    activities: [
      {
        id: `${base.id}-a1`,
        type: 'whatsapp',
        label: 'WhatsApp message',
        description: 'Confirmed delivery address for khejur order',
        timestamp: base.lastContactAt ?? base.createdAt,
        actorName: base.assignedAgentName,
      },
      {
        id: `${base.id}-a2`,
        type: 'call',
        label: 'Outbound call',
        description: 'Discussed Ajwa khejur pricing',
        timestamp: base.createdAt,
        actorName: base.assignedAgentName,
      },
    ],
  };
}

function buildNonCustomerContact(
  index: number,
  contactType: Exclude<ContactType, 'customer'>,
  overrides: Partial<ContactListItem> & Pick<ContactListItem, 'name' | 'organizationName' | 'roleLabel'>,
): ContactDetail {
  const createdDay = 15 - (index % 10);
  const createdAt = `2024-04-${String(createdDay).padStart(2, '0')}T09:00:00.000Z`;
  const source = (['call', 'walk_in', 'facebook'] as const)[index % 3];

  const base: ContactListItem = {
    id: `contact-${contactType}-${index}`,
    name: overrides.name,
    phone: overrides.phone ?? `01${String(820000000 + index).slice(0, 9)}`,
    email: overrides.email,
    contactType,
    organizationName: overrides.organizationName,
    roleLabel: overrides.roleLabel,
    source: overrides.source ?? source,
    area: overrides.area ?? 'Dhaka',
    district: overrides.district ?? 'Dhaka',
    address: overrides.address,
    assignedAgentName: overrides.assignedAgentName ?? CONTACT_AGENTS[index % CONTACT_AGENTS.length],
    lastContactAt: overrides.lastContactAt ?? `2024-06-${String(10 + (index % 8)).padStart(2, '0')}T11:00:00.000Z`,
    createdAt,
    recentProducts: [],
    tags: overrides.tags ?? [],
    hasNotes: overrides.hasNotes ?? index % 2 === 0,
    hasFollowUp: overrides.hasFollowUp ?? false,
  };

  return {
    ...base,
    notes: base.hasNotes
      ? contactType === 'supplier'
        ? 'Bulk honey supply — negotiate price before Ramadan.'
        : contactType === 'partner'
          ? 'Pathao hub contact for same-day Dhaka delivery.'
          : 'Facebook page admin — coordinate Ramadan campaign posts.'
      : undefined,
    activities: [
      {
        id: `${base.id}-a1`,
        type: 'call',
        label: 'Phone call',
        description: `Spoke with ${base.name} at ${base.organizationName}`,
        timestamp: base.lastContactAt ?? base.createdAt,
        actorName: base.assignedAgentName,
      },
    ],
  };
}

export const MOCK_CONTACTS: ContactDetail[] = [
  ...Array.from({ length: 22 }, (_, i) => buildCustomerContact(i + 1)),
  buildNonCustomerContact(1, 'supplier', {
    name: 'Abdul Jabbar',
    organizationName: 'Sundarban Honey Co-op',
    roleLabel: 'Honey supplier',
    tags: ['Supplier', 'Modhu'],
    phone: '01711234567',
  }),
  buildNonCustomerContact(2, 'supplier', {
    name: 'Rafiqul Islam',
    organizationName: 'Medina Dates Import',
    roleLabel: 'Khejur importer',
    tags: ['Supplier', 'Khejur'],
  }),
  buildNonCustomerContact(3, 'supplier', {
    name: 'Hasan Mahmud',
    organizationName: 'Sylhet Organic Farm',
    roleLabel: 'Raw honey source',
    tags: ['Supplier'],
  }),
  buildNonCustomerContact(4, 'partner', {
    name: 'Tanvir Ahmed',
    organizationName: 'Pathao Hub — Mirpur',
    roleLabel: 'Courier hub manager',
    tags: ['Courier'],
    area: 'Mirpur',
  }),
  buildNonCustomerContact(5, 'partner', {
    name: 'Sadia Rahman',
    organizationName: 'RedX Logistics',
    roleLabel: 'Account manager',
    tags: ['Courier'],
  }),
  buildNonCustomerContact(6, 'partner', {
    name: 'Kamal Hossain',
    organizationName: 'Gift Box Packaging BD',
    roleLabel: 'Packaging vendor',
    tags: ['Packaging'],
  }),
  buildNonCustomerContact(7, 'other', {
    name: 'Nadia Islam',
    organizationName: 'Modhu Lovers FB Group',
    roleLabel: 'Community admin',
    tags: ['Facebook', 'Influencer'],
    source: 'facebook',
  }),
  buildNonCustomerContact(8, 'other', {
    name: 'Dr. Anwar Hossain',
    organizationName: undefined,
    roleLabel: 'Nutrition blogger',
    tags: ['Influencer'],
    source: 'facebook',
  }),
  buildNonCustomerContact(9, 'other', {
    name: 'Liton Das',
    organizationName: 'Local mosque committee',
    roleLabel: 'Bulk order coordinator',
    tags: ['Ramadan', 'Bulk'],
    source: 'walk_in',
  }),
];

export function getMockContactById(id: string): ContactDetail | undefined {
  return MOCK_CONTACTS.find((contact) => contact.id === id);
}

export function createMockContact(payload: CreateContactPayload): ContactDetail {
  const nextIndex = MOCK_CONTACTS.length + 1;
  const createdAt = new Date().toISOString();
  const isCustomer = payload.contactType === 'customer';

  const base: ContactDetail = {
    id: `contact-${payload.contactType}-${nextIndex}`,
    contactNumber: isCustomer ? String(1616000 + nextIndex) : undefined,
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    contactType: payload.contactType,
    organizationName: payload.organizationName,
    roleLabel: payload.roleLabel,
    source: payload.source,
    area: payload.area,
    district: payload.district,
    address: payload.address,
    assignedAgentName: payload.assignedAgentName ?? CONTACT_AGENTS[0],
    lastContactAt: createdAt,
    createdAt,
    orderCount: isCustomer ? 0 : undefined,
    deliveredCount: isCustomer ? 0 : undefined,
    totalSpent: isCustomer ? 0 : undefined,
    courierScore: isCustomer ? { total: 0, success: 0, failed: 0, rate: 100 } : undefined,
    recentProducts: [],
    tags: [],
    hasNotes: Boolean(payload.notes?.trim()),
    hasFollowUp: false,
    customerId: isCustomer ? `cust-${nextIndex}` : undefined,
    notes: payload.notes,
    activities: [
      {
        id: `contact-${nextIndex}-a1`,
        type: 'note',
        label: 'Contact created',
        description: 'Added from contact form',
        timestamp: createdAt,
        actorName: payload.assignedAgentName ?? CONTACT_AGENTS[0],
      },
    ],
  };

  MOCK_CONTACTS.unshift(base);
  return base;
}

export function updateMockContact(
  id: string,
  patch: {
    notes?: string;
    tags?: string[];
    hasFollowUp?: boolean;
    followUpDue?: string;
    assignedAgentName?: string;
  },
): ContactDetail | undefined {
  const index = MOCK_CONTACTS.findIndex((c) => c.id === id);
  if (index === -1) return undefined;
  const current = MOCK_CONTACTS[index];
  const updated: ContactDetail = {
    ...current,
    ...patch,
    hasNotes: patch.notes !== undefined ? Boolean(patch.notes.trim()) : current.hasNotes,
    tags: patch.tags ?? current.tags,
  };
  MOCK_CONTACTS[index] = updated;
  return updated;
}

export function bulkUpdateMockContacts(payload: {
  contactIds: string[];
  note?: string;
  assignedAgentName?: string;
  followUpDue?: string;
}): { successCount: number; failedCount: number } {
  let successCount = 0;
  let failedCount = 0;
  for (const id of payload.contactIds) {
    const patch: Parameters<typeof updateMockContact>[1] = {};
    if (payload.note) patch.notes = payload.note;
    if (payload.assignedAgentName) patch.assignedAgentName = payload.assignedAgentName;
    if (payload.followUpDue) {
      patch.hasFollowUp = true;
      patch.followUpDue = payload.followUpDue;
    }
    const result = updateMockContact(id, patch);
    if (result) successCount++;
    else failedCount++;
  }
  return { successCount, failedCount };
}

function computeSegments(all: ContactListItem[]): ContactSegmentCount[] {
  return CONTACT_SEGMENTS.map((seg) => {
    let count = all.length;
    if (seg.contactType) {
      count = all.filter((c) => c.contactType === seg.contactType).length;
    } else if (seg.id === 'has_followup') {
      count = all.filter((c) => c.hasFollowUp).length;
    }
    return { id: seg.id, label: seg.label, count };
  });
}

export function filterMockContacts(query: ContactListQuery): ContactListResponse {
  const search = query.search?.trim().toLowerCase() ?? '';
  const allMatching = MOCK_CONTACTS.filter((contact) => {
    if (query.contactType && contact.contactType !== query.contactType) return false;
    if (query.source && contact.source !== query.source) return false;

    if (query.segment && query.segment !== 'all') {
      const seg = CONTACT_SEGMENTS.find((s) => s.id === query.segment);
      if (seg?.contactType && contact.contactType !== seg.contactType) return false;
      if (query.segment === 'has_followup' && !contact.hasFollowUp) return false;
    }

    if (!search) return true;
    return (
      contact.name.toLowerCase().includes(search) ||
      contact.phone.includes(search) ||
      (contact.email?.toLowerCase().includes(search) ?? false) ||
      (contact.organizationName?.toLowerCase().includes(search) ?? false) ||
      (contact.contactNumber?.includes(search) ?? false) ||
      (contact.roleLabel?.toLowerCase().includes(search) ?? false)
    );
  });

  const listItems = allMatching.map(
    ({ activities: _a, notes: _n, ...listItem }) => listItem,
  );

  const customerItems = listItems.filter((c) => c.contactType === 'customer');
  const avgCourierRate =
    customerItems.length > 0
      ? customerItems.reduce((sum, c) => sum + (c.courierScore?.rate ?? 0), 0) / customerItems.length
      : 0;

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
      customerCount: listItems.filter((c) => c.contactType === 'customer').length,
      supplierCount: listItems.filter((c) => c.contactType === 'supplier').length,
      avgCourierRate,
    },
    segments: computeSegments(listItems),
  };
}

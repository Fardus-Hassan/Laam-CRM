import type {
  CompanyDetail,
  CompanyListQuery,
  CompanyListResponse,
  ContactDetail,
  ContactListQuery,
  ContactListResponse,
  DealDetail,
  DealListQuery,
  DealListResponse,
  LeadDetail,
  LeadListQuery,
  LeadListResponse,
  OrderDetail,
  OrderListQuery,
  OrderListResponse,
  PipelineResponse,
} from '@laam/types';

import { DEAL_STAGE_ORDER } from './deal-stages';

const AGENTS = ['Sakib Ahmed', 'Mitu Rahman', 'Imran Hossain', 'Tania Sultana', 'Arif Mahmud'];

// --- Leads ---
const LEADS: LeadDetail[] = buildLeads();
// --- Contacts ---
const CONTACTS: ContactDetail[] = buildContacts();
// --- Companies ---
const COMPANIES: CompanyDetail[] = buildCompanies();
// --- Deals ---
const DEALS: DealDetail[] = buildDeals();
// --- Orders (subset) ---
const ORDERS: OrderDetail[] = buildOrders();

function buildLeads(): LeadDetail[] {
  const names = ['Rahim Uddin', 'Fatema Akter', 'Karim Hassan', 'Nusrat Jahan', 'Sakib Ahmed'];
  return names.map((name, index) => {
    const i = index + 1;
    const status = (['new', 'contacted', 'qualified', 'converted', 'lost'] as const)[index % 5];
    const source = (['facebook', 'call', 'ecommerce', 'walk_in'] as const)[index % 4];
    const createdAt = `2024-05-${String(20 + i).padStart(2, '0')}T09:00:00.000Z`;
    return {
      id: `lead-${i}`,
      leadNumber: `LD-${2000 + i}`,
      name,
      phone: `0170000000${i}`,
      email: `${name.split(' ')[0].toLowerCase()}@email.com`,
      source,
      status,
      assignedAgentName: i % 3 === 0 ? undefined : AGENTS[i % AGENTS.length],
      area: 'Dhaka',
      estimatedValue: 5000 + i * 1000,
      campaignName: 'FB Lead Form',
      createdAt,
      lastActivityAt: createdAt,
      tags: [],
      activities: [{ id: `lead-${i}-a1`, type: 'created', label: 'Lead created', timestamp: createdAt }],
    };
  });
}

function buildContacts(): ContactDetail[] {
  return LEADS.map((lead, index) => ({
    id: `contact-${index + 1}`,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    companyName: index % 2 === 0 ? 'Akash Traders' : undefined,
    jobTitle: 'Manager',
    source: lead.source,
    assignedAgentName: lead.assignedAgentName,
    lastContactAt: lead.lastActivityAt,
    createdAt: lead.createdAt,
    tags: [],
    activities: [],
    leadId: lead.id,
  }));
}

function buildCompanies(): CompanyDetail[] {
  return ['Akash Traders', 'Green Valley Ltd', 'Dhaka Mart'].map((name, index) => {
    const i = index + 1;
    const status = (['active', 'prospect', 'active'] as const)[index];
    return {
      id: `company-${i}`,
      name,
      industry: 'Retail',
      status,
      phone: `02-5500000${i}`,
      email: `info@${name.toLowerCase().replace(/\s+/g, '')}.com`,
      contactCount: 2 + index,
      dealValue: 50000 + i * 20000,
      assignedAgentName: AGENTS[index],
      city: 'Dhaka',
      createdAt: '2024-05-10T08:00:00.000Z',
      tags: [],
      contactIds: [],
      dealIds: [`deal-${i}`],
    };
  });
}

function buildDeals(): DealDetail[] {
  return [
    { title: 'Bulk order', stage: 'new_lead' as const },
    { title: 'Corporate contract', stage: 'qualified' as const },
    { title: 'Retail partnership', stage: 'proposal' as const },
    { title: 'Export deal', stage: 'won' as const },
  ].map((item, index) => {
    const i = index + 1;
    const createdAt = '2024-05-15T14:00:00.000Z';
    const updatedAt = '2024-05-16T10:00:00.000Z';
    return {
      id: `deal-${i}`,
      dealNumber: `DL-${3000 + i}`,
      title: item.title,
      companyName: COMPANIES[index % COMPANIES.length]?.name ?? 'Akash Traders',
      contactName: `Contact ${i}`,
      stage: item.stage,
      amount: 30000 + i * 15000,
      probability: 30 + i * 15,
      expectedCloseDate: '2024-06-20',
      assignedAgentName: AGENTS[i % AGENTS.length],
      createdAt,
      updatedAt,
      activities: [{ id: `deal-${i}-a1`, type: 'created', label: 'Deal created', timestamp: createdAt }],
    };
  });
}

function buildOrders(): OrderDetail[] {
  return [
    { customerName: 'Rahim Uddin', status: 'pending' as const },
    { customerName: 'Fatema Akter', status: 'confirmed' as const },
    { customerName: 'Karim Hassan', status: 'delivered' as const },
  ].map((item, index) => {
    const i = index + 1;
    const createdAt = '2024-05-18T10:00:00.000Z';
    const amount = 5000 + i * 1000;
    return {
      id: `order-${i}`,
      orderNumber: `ORD-${1000 + i}`,
      status: item.status,
      customerName: item.customerName,
      customerPhone: `0180000000${i}`,
      source: 'facebook' as const,
      itemsCount: 2,
      amount,
      paymentStatus: 'cod' as const,
      assignedAgentName: AGENTS[i % AGENTS.length],
      shippingArea: 'Gulshan',
      createdAt,
      shippingAddress: 'Dhaka',
      deliveryCharge: 120,
      discount: 0,
      subtotal: amount - 120,
      lineItems: [
        { id: `line-${i}`, productName: 'Premium Dates', quantity: 1, unitPrice: amount - 120, lineTotal: amount - 120 },
      ],
      timeline: [{ id: `t-${i}`, type: 'created', label: 'Order created', timestamp: createdAt }],
    };
  });
}

export function listLeads(query: LeadListQuery): LeadListResponse {
  const search = query.search?.trim().toLowerCase() ?? '';
  const items = LEADS.filter((lead) => {
    if (query.status === 'unassigned' && lead.assignedAgentName) return false;
    if (query.status && query.status !== 'unassigned' && lead.status !== query.status) return false;
    if (query.source && lead.source !== query.source) return false;
    if (!search) return true;
    return lead.name.toLowerCase().includes(search) || lead.leadNumber.toLowerCase().includes(search);
  });
  const listItems = items.map(({ activities: _a, notes: _n, tags: _t, ...rest }) => rest);
  const totalEstimatedValue = items.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
  return {
    items: listItems.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
    total: items.length,
    page: query.page,
    pageSize: query.pageSize,
    summary: {
      count: items.length,
      totalEstimatedValue,
      unassignedCount: items.filter((l) => !l.assignedAgentName).length,
    },
  };
}

export function getLead(id: string): LeadDetail | undefined {
  return LEADS.find((l) => l.id === id || l.leadNumber === id);
}

export function listContacts(query: ContactListQuery): ContactListResponse {
  const search = query.search?.trim().toLowerCase() ?? '';
  const items = CONTACTS.filter((c) => {
    if (query.source && c.source !== query.source) return false;
    if (!search) return true;
    return c.name.toLowerCase().includes(search) || c.phone.includes(search);
  });
  const listItems = items.map(({ activities: _a, notes: _n, tags: _t, address: _ad, ...rest }) => rest);
  return {
    items: listItems.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
    total: items.length,
    page: query.page,
    pageSize: query.pageSize,
    summary: { count: items.length, withCompanyCount: items.filter((c) => c.companyName).length },
  };
}

export function getContact(id: string): ContactDetail | undefined {
  return CONTACTS.find((c) => c.id === id);
}

export function listCompanies(query: CompanyListQuery): CompanyListResponse {
  const search = query.search?.trim().toLowerCase() ?? '';
  const items = COMPANIES.filter((c) => {
    if (query.status && c.status !== query.status) return false;
    if (!search) return true;
    return c.name.toLowerCase().includes(search);
  });
  const listItems = items.map(
    ({ contactIds: _c, dealIds: _d, notes: _n, tags: _t, address: _a, website: _w, ...rest }) => rest,
  );
  return {
    items: listItems.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
    total: items.length,
    page: query.page,
    pageSize: query.pageSize,
    summary: {
      count: items.length,
      totalDealValue: items.reduce((s, c) => s + c.dealValue, 0),
      activeCount: items.filter((c) => c.status === 'active').length,
    },
  };
}

export function getCompany(id: string): CompanyDetail | undefined {
  return COMPANIES.find((c) => c.id === id);
}

export function listDeals(query: DealListQuery): DealListResponse {
  const search = query.search?.trim().toLowerCase() ?? '';
  const items = DEALS.filter((d) => {
    if (query.stage && d.stage !== query.stage) return false;
    if (!search) return true;
    return d.title.toLowerCase().includes(search) || d.dealNumber.toLowerCase().includes(search);
  });
  const listItems = items.map(
    ({ activities: _a, notes: _n, companyId: _c, contactId: _ct, leadId: _l, wonAt: _w, lostReason: _lr, ...rest }) =>
      rest,
  );
  const totalAmount = items.reduce((s, d) => s + d.amount, 0);
  const weightedAmount = items.reduce((s, d) => s + d.amount * (d.probability / 100), 0);
  return {
    items: listItems.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
    total: items.length,
    page: query.page,
    pageSize: query.pageSize,
    summary: { count: items.length, totalAmount, weightedAmount },
  };
}

export function getDeal(id: string): DealDetail | undefined {
  return DEALS.find((d) => d.id === id || d.dealNumber === id);
}

export function getPipeline(): PipelineResponse {
  const summary = listDeals({ page: 1, pageSize: 100 });
  const listItems = DEALS.map(
    ({ activities: _a, notes: _n, companyId: _c, contactId: _ct, leadId: _l, wonAt: _w, lostReason: _lr, ...rest }) =>
      rest,
  );
  return {
    stages: DEAL_STAGE_ORDER.map((stage) => {
      const deals = listItems.filter((d) => d.stage === stage);
      return { stage, count: deals.length, totalAmount: deals.reduce((s, d) => s + d.amount, 0), deals };
    }),
    summary: summary.summary,
  };
}

export function listOrders(query: OrderListQuery): OrderListResponse {
  const search = query.search?.trim().toLowerCase() ?? '';
  const items = ORDERS.filter((o) => {
    if (query.status && o.status !== query.status) return false;
    if (query.source && o.source !== query.source) return false;
    if (!search) return true;
    return o.orderNumber.toLowerCase().includes(search) || o.customerName.toLowerCase().includes(search);
  });
  const listItems = items.map(({ lineItems: _l, timeline: _t, ...rest }) => rest);
  const totalAmount = items.reduce((s, o) => s + o.amount, 0);
  return {
    items: listItems.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
    total: items.length,
    page: query.page,
    pageSize: query.pageSize,
    summary: { count: items.length, totalAmount },
  };
}

export function getOrder(id: string): OrderDetail | undefined {
  return ORDERS.find((o) => o.id === id || o.orderNumber === id);
}

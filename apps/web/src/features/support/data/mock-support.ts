import type {
  CreateTicketPayload,
  SupportTicket,
  TicketListQuery,
  TicketListResponse,
} from '@laam/types';
import { newBrowserId } from '@/lib/device-id';

let tickets: SupportTicket[] = [
  {
    id: 'tk-1',
    subject: 'Wrong product delivered — modhu instead of khejur',
    status: 'open',
    priority: 'high',
    customerName: 'Fatima Begum',
    customerMobile: '01712345678',
    orderId: 'ord-1',
    orderNumber: 'MH-8821',
    assigneeName: 'Sakib Ahmed',
    createdAt: '2026-07-04T08:00:00Z',
    updatedAt: '2026-07-04T09:00:00Z',
    messages: [
      { id: 'm1', authorName: 'Fatima Begum', authorRole: 'customer', body: 'I ordered khejur 1kg but received modhu 500g.', createdAt: '2026-07-04T08:00:00Z' },
      { id: 'm2', authorName: 'Sakib Ahmed', authorRole: 'agent', body: 'Sorry for the mix-up. We will arrange a replacement today.', createdAt: '2026-07-04T08:30:00Z' },
    ],
  },
  {
    id: 'tk-2',
    subject: 'COD amount mismatch',
    status: 'pending',
    priority: 'medium',
    customerName: 'Karim Uddin',
    customerMobile: '01898765432',
    orderId: 'ord-2',
    orderNumber: 'MH-8819',
    assigneeName: 'Mitu Rahman',
    createdAt: '2026-07-03T14:00:00Z',
    updatedAt: '2026-07-03T16:00:00Z',
    messages: [
      { id: 'm3', authorName: 'Karim Uddin', authorRole: 'customer', body: 'Rider asked for ৳2,800 but invoice says ৳2,450.', createdAt: '2026-07-03T14:00:00Z' },
    ],
  },
  {
    id: 'tk-3',
    subject: 'Late delivery — Ramadan gift box',
    status: 'resolved',
    priority: 'low',
    customerName: 'Ayesha Khan',
    customerMobile: '01955667788',
    orderNumber: 'MH-8801',
    assigneeName: 'Sakib Ahmed',
    createdAt: '2026-07-01T10:00:00Z',
    updatedAt: '2026-07-02T11:00:00Z',
    messages: [
      { id: 'm4', authorName: 'Ayesha Khan', authorRole: 'customer', body: 'Gift was supposed to arrive before Eid.', createdAt: '2026-07-01T10:00:00Z' },
      { id: 'm5', authorName: 'Sakib Ahmed', authorRole: 'agent', body: 'Delivered with apology discount coupon RAMADAN10.', createdAt: '2026-07-02T11:00:00Z' },
    ],
  },
  {
    id: 'tk-4',
    subject: 'Refund request — damaged packaging',
    status: 'open',
    priority: 'urgent',
    customerName: 'Rashid Ahmed',
    customerMobile: '01611223344',
    orderNumber: 'MH-8790',
    createdAt: '2026-07-04T07:00:00Z',
    updatedAt: '2026-07-04T07:00:00Z',
    messages: [
      { id: 'm6', authorName: 'Rashid Ahmed', authorRole: 'customer', body: 'Bottle leaked. Need full refund.', createdAt: '2026-07-04T07:00:00Z' },
    ],
  },
];

export function getOpenTicketCount(): number {
  return tickets.filter((t) => t.status === 'open' || t.status === 'pending').length;
}

export function filterTickets(query: TicketListQuery): TicketListResponse {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  let items = [...tickets];
  if (query.status) items = items.filter((t) => t.status === query.status);
  if (query.search) {
    const q = query.search.toLowerCase();
    items = items.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.orderNumber?.toLowerCase().includes(q),
    );
  }
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    summary: {
      open: tickets.filter((t) => t.status === 'open').length,
      pending: tickets.filter((t) => t.status === 'pending').length,
      resolved: tickets.filter((t) => t.status === 'resolved').length,
      urgent: tickets.filter((t) => t.priority === 'urgent').length,
    },
  };
}

export function getTicket(id: string): SupportTicket | undefined {
  return tickets.find((t) => t.id === id);
}

export function createTicket(payload: CreateTicketPayload): SupportTicket {
  const ticket: SupportTicket = {
    id: `tk-${newBrowserId().slice(0, 8)}`,
    subject: payload.subject,
    status: 'open',
    priority: payload.priority,
    customerName: payload.customerName,
    customerMobile: payload.customerMobile,
    orderNumber: payload.orderNumber,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: `m-${newBrowserId().slice(0, 6)}`,
        authorName: 'Laam Org Admin',
        authorRole: 'agent',
        body: payload.body,
        createdAt: new Date().toISOString(),
      },
    ],
  };
  tickets = [ticket, ...tickets];
  return ticket;
}

export function updateTicketStatus(
  id: string,
  status: SupportTicket['status'],
): SupportTicket | undefined {
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx < 0) return undefined;
  const updated: SupportTicket = {
    ...tickets[idx],
    status,
    updatedAt: new Date().toISOString(),
  };
  tickets = tickets.map((t, i) => (i === idx ? updated : t));
  return updated;
}

export function addTicketReply(id: string, body: string): SupportTicket | undefined {
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx < 0) return undefined;
  const ticket = tickets[idx];
  const updated: SupportTicket = {
    ...ticket,
    updatedAt: new Date().toISOString(),
    messages: [
      ...ticket.messages,
      {
        id: `m-${newBrowserId().slice(0, 6)}`,
        authorName: 'Laam Org Admin',
        authorRole: 'agent',
        body,
        createdAt: new Date().toISOString(),
      },
    ],
  };
  tickets = tickets.map((t, i) => (i === idx ? updated : t));
  return updated;
}

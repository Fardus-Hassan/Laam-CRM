import type {
  CreateTicketPayload,
  SupportTicket,
  TicketListQuery,
  TicketListResponse,
} from '@laam/types';

import {
  addTicketReply,
  createTicket,
  filterTickets,
  getTicket,
  updateTicketStatus,
} from '@/features/support/data/mock-support';
import { apiRequest } from '@/lib/api/client';

export type SupportApi = {
  listTickets: (query: TicketListQuery) => Promise<TicketListResponse>;
  getTicket: (id: string) => Promise<SupportTicket | null>;
  createTicket: (payload: CreateTicketPayload) => Promise<SupportTicket>;
  reply: (id: string, body: string) => Promise<SupportTicket>;
  updateStatus: (id: string, status: SupportTicket['status']) => Promise<SupportTicket>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockSupportApi(): SupportApi {
  return {
    async listTickets(query) {
      await delay(100);
      return filterTickets(query);
    },
    async getTicket(id) {
      await delay(80);
      return getTicket(id) ?? null;
    },
    async createTicket(payload) {
      await delay(150);
      return createTicket(payload);
    },
    async reply(id, body) {
      await delay(100);
      const ticket = addTicketReply(id, body);
      if (!ticket) throw new Error('Ticket not found');
      return ticket;
    },
    async updateStatus(id, status) {
      await delay(80);
      const ticket = updateTicketStatus(id, status);
      if (!ticket) throw new Error('Ticket not found');
      return ticket;
    },
  };
}

export function createHttpSupportApi(): SupportApi {
  return {
    listTickets: (query) => {
      const params = new URLSearchParams();
      if (query.status) params.set('status', query.status);
      if (query.search) params.set('search', query.search);
      if (query.page) params.set('page', String(query.page));
      const qs = params.toString();
      return apiRequest(`/crm/support/tickets${qs ? `?${qs}` : ''}`);
    },
    getTicket: (id) => apiRequest(`/crm/support/tickets/${id}`),
    createTicket: (payload) =>
      apiRequest('/crm/support/tickets', { method: 'POST', body: JSON.stringify(payload) }),
    reply: (id, body) =>
      apiRequest(`/crm/support/tickets/${id}/reply`, { method: 'POST', body: JSON.stringify({ body }) }),
    updateStatus: (id, status) =>
      apiRequest(`/crm/support/tickets/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const supportApi = useHttpApi ? createHttpSupportApi() : createMockSupportApi();

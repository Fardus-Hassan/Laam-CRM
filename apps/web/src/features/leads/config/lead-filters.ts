import type { LeadStatus } from '@laam/types';

export type LeadFilter = LeadStatus | 'all' | 'unassigned';

export const LEAD_SOURCE_FILTERS: {
  id: string;
  label: string;
  href: string;
  isActive: (params: URLSearchParams) => boolean;
}[] = [
  {
    id: 'all',
    label: 'All Leads',
    href: '/dashboard/leads',
    isActive: (params) => !params.get('status') && !params.get('source'),
  },
  {
    id: 'facebook',
    label: 'Facebook',
    href: '/dashboard/leads?source=facebook',
    isActive: (params) => params.get('source') === 'facebook',
  },
  {
    id: 'call',
    label: 'Inbound Call',
    href: '/dashboard/leads?source=call',
    isActive: (params) => params.get('source') === 'call',
  },
  {
    id: 'ecommerce',
    label: 'E-commerce',
    href: '/dashboard/leads?source=ecommerce',
    isActive: (params) => params.get('source') === 'ecommerce',
  },
  {
    id: 'unassigned',
    label: 'Unassigned',
    href: '/dashboard/leads?status=unassigned',
    isActive: (params) => params.get('status') === 'unassigned',
  },
];

export const LEAD_PAGE_COPY = {
  all: {
    title: 'Leads',
    description: 'Pre-orders from Facebook, calls, and your shop — qualify and convert to orders.',
  },
  unassigned: {
    title: 'Unassigned leads',
    description: 'Inbound inquiries waiting for an agent to call back.',
  },
  facebook: {
    title: 'Facebook leads',
    description: 'Modhu & khejur interest from Facebook ads and messenger.',
  },
  call: {
    title: 'Phone leads',
    description: 'Inbound calls asking about products, price, and delivery.',
  },
  ecommerce: {
    title: 'Online leads',
    description: 'Leads from your website or online store forms.',
  },
} as const;

export const LEAD_SOURCE_LABELS = {
  facebook: 'Facebook',
  call: 'Inbound Call',
  ecommerce: 'E-commerce',
  walk_in: 'Walk-in',
} as const;

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
  lost: 'Lost',
};

export function getLeadPageCopy(params: { status?: string; source?: string }) {
  if (params.status === 'unassigned') {
    return LEAD_PAGE_COPY.unassigned;
  }
  if (params.source === 'facebook') {
    return LEAD_PAGE_COPY.facebook;
  }
  if (params.source === 'call') {
    return LEAD_PAGE_COPY.call;
  }
  if (params.source === 'ecommerce') {
    return LEAD_PAGE_COPY.ecommerce;
  }
  return LEAD_PAGE_COPY.all;
}

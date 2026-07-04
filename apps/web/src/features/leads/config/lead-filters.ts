import type { LeadStatus, OrderSource } from '@laam/types';

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
    label: 'Facebook Ad',
    href: '/dashboard/leads?source=facebook',
    isActive: (params) => params.get('source') === 'facebook',
  },
  {
    id: 'campaign',
    label: 'Campaign',
    href: '/dashboard/leads?source=campaign',
    isActive: (params) => params.get('source') === 'campaign',
  },
  {
    id: 'website',
    label: 'Website',
    href: '/dashboard/leads?source=website',
    isActive: (params) => params.get('source') === 'website',
  },
  {
    id: 'landing_page',
    label: 'Landing Page',
    href: '/dashboard/leads?source=landing_page',
    isActive: (params) => params.get('source') === 'landing_page',
  },
  {
    id: 'call',
    label: 'Inbound Call',
    href: '/dashboard/leads?source=call',
    isActive: (params) => params.get('source') === 'call',
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
    description:
      'Inbox from Facebook ads, campaigns, website, and landing pages — call center confirms and converts to orders.',
  },
  unassigned: {
    title: 'Unassigned leads',
    description: 'Inbound inquiries waiting for an agent to call back.',
  },
  facebook: {
    title: 'Facebook Ad leads',
    description: 'Honey + Kalojira Mix interest from Facebook ads.',
  },
  campaign: {
    title: 'Campaign leads',
    description: 'Leads from Facebook campaigns and knock-day ads.',
  },
  website: {
    title: 'Website leads',
    description: 'Form submissions from your main website.',
  },
  landing_page: {
    title: 'Landing page leads',
    description: 'Leads from dedicated landing pages.',
  },
  call: {
    title: 'Phone leads',
    description: 'Inbound calls asking about products, price, and delivery.',
  },
  ecommerce: {
    title: 'Online store leads',
    description: 'Leads from your online store forms.',
  },
} as const;

export const LEAD_SOURCE_LABELS: Record<OrderSource, string> = {
  facebook: 'Facebook Ad',
  campaign: 'Facebook Campaign',
  website: 'Website',
  landing_page: 'Landing Page',
  call: 'Inbound Call',
  ecommerce: 'Online Store',
  walk_in: 'Walk-in',
};

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
  if (params.source && params.source in LEAD_PAGE_COPY) {
    return LEAD_PAGE_COPY[params.source as keyof typeof LEAD_PAGE_COPY];
  }
  return LEAD_PAGE_COPY.all;
}

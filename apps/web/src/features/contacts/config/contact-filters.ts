import type { OrderSource } from '@laam/types';

export const CONTACT_SOURCE_FILTERS: {
  id: string;
  label: string;
  href: string;
  isActive: (params: URLSearchParams) => boolean;
}[] = [
  {
    id: 'all',
    label: 'All sources',
    href: '/dashboard/contacts',
    isActive: (params) => !params.get('source'),
  },
  {
    id: 'facebook',
    label: 'Facebook',
    href: '/dashboard/contacts?source=facebook',
    isActive: (params) => params.get('source') === 'facebook',
  },
  {
    id: 'call',
    label: 'Phone',
    href: '/dashboard/contacts?source=call',
    isActive: (params) => params.get('source') === 'call',
  },
  {
    id: 'ecommerce',
    label: 'Online',
    href: '/dashboard/contacts?source=ecommerce',
    isActive: (params) => params.get('source') === 'ecommerce',
  },
  {
    id: 'walk_in',
    label: 'Walk-in',
    href: '/dashboard/contacts?source=walk_in',
    isActive: (params) => params.get('source') === 'walk_in',
  },
];

export const CONTACT_SOURCE_LABELS: Record<OrderSource, string> = {
  facebook: 'Facebook Ad',
  campaign: 'Facebook Campaign',
  website: 'Website',
  landing_page: 'Landing Page',
  call: 'Phone',
  ecommerce: 'Online Store',
  walk_in: 'Walk-in',
};

export function getContactPageCopy() {
  return {
    title: 'Suppliers & partners',
    description:
      'B2B contacts — suppliers, courier partners, and others. Buyers live under Customers; purchase vendors with stock live under Inventory → Suppliers.',
  };
}

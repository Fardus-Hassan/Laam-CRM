import type { OrderSource } from '@laam/types';

export const CONTACT_SOURCE_FILTERS: {
  id: string;
  label: string;
  href: string;
  isActive: (params: URLSearchParams) => boolean;
}[] = [
  {
    id: 'all',
    label: 'All Contacts',
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
    label: 'Inbound Call',
    href: '/dashboard/contacts?source=call',
    isActive: (params) => params.get('source') === 'call',
  },
  {
    id: 'ecommerce',
    label: 'E-commerce',
    href: '/dashboard/contacts?source=ecommerce',
    isActive: (params) => params.get('source') === 'ecommerce',
  },
];

export const CONTACT_SOURCE_LABELS: Record<OrderSource, string> = {
  facebook: 'Facebook',
  call: 'Inbound Call',
  ecommerce: 'E-commerce',
  walk_in: 'Walk-in',
};

export function getContactPageCopy(source?: string) {
  if (source === 'facebook') {
    return { title: 'Facebook Contacts', description: 'Contacts acquired from Facebook channels.' };
  }
  if (source === 'call') {
    return { title: 'Call Contacts', description: 'Contacts from inbound calls.' };
  }
  if (source === 'ecommerce') {
    return { title: 'E-commerce Contacts', description: 'Contacts from online store.' };
  }
  return {
    title: 'Contacts',
    description: 'Manage people and communication history across your organization.',
  };
}

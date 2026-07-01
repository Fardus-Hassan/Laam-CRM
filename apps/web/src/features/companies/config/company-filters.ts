import type { CompanyStatus } from '@laam/types';

export const COMPANY_STATUS_FILTERS: {
  id: string;
  label: string;
  href: string;
  isActive: (params: URLSearchParams) => boolean;
}[] = [
  {
    id: 'all',
    label: 'All Customers',
    href: '/dashboard/companies',
    isActive: (params) => !params.get('status'),
  },
  {
    id: 'active',
    label: 'Active',
    href: '/dashboard/companies?status=active',
    isActive: (params) => params.get('status') === 'active',
  },
  {
    id: 'prospect',
    label: 'New buyers',
    href: '/dashboard/companies?status=prospect',
    isActive: (params) => params.get('status') === 'prospect',
  },
  {
    id: 'inactive',
    label: 'Inactive',
    href: '/dashboard/companies?status=inactive',
    isActive: (params) => params.get('status') === 'inactive',
  },
];

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  active: 'Repeat buyer',
  inactive: 'Inactive',
  prospect: 'New buyer',
};

export function getCompanyPageCopy(status?: string) {
  if (status === 'active') {
    return {
      title: 'Repeat buyers',
      description: 'Customers who order modhu, khejur and gift items regularly.',
    };
  }
  if (status === 'prospect') {
    return {
      title: 'New buyers',
      description: 'First-time or recent buyers — follow up to build repeat orders.',
    };
  }
  if (status === 'inactive') {
    return {
      title: 'Inactive buyers',
      description: 'No recent orders — win them back with offers or a call.',
    };
  }
  return {
    title: 'Customers',
    description: 'Everyday buyers — mobile, orders, and delivery history in one place.',
  };
}

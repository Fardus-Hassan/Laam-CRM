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
    label: 'Prospects',
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
  active: 'Active',
  inactive: 'Inactive',
  prospect: 'Prospect',
};

export function getCompanyPageCopy(status?: string) {
  if (status === 'active') {
    return { title: 'Active Customers', description: 'Currently active customer accounts.' };
  }
  if (status === 'prospect') {
    return { title: 'Prospect Customers', description: 'Potential customers in pipeline.' };
  }
  if (status === 'inactive') {
    return { title: 'Inactive Customers', description: 'Inactive or churned accounts.' };
  }
  return {
    title: 'Customers',
    description: 'Track accounts, industries, and related opportunities.',
  };
}

import type {
  CompanyDetail,
  CompanyListItem,
  CompanyListQuery,
  CompanyListResponse,
} from '@laam/types';

const AGENTS = ['Sakib Ahmed', 'Mitu Rahman', 'Imran Hossain'];
const INDUSTRIES = ['Retail', 'Wholesale', 'E-commerce', 'Food & Beverage', 'Electronics'];

function buildCompany(
  index: number,
  overrides: Partial<CompanyListItem> & Pick<CompanyListItem, 'name' | 'status'>,
): CompanyDetail {
  const createdDay = 20 - (index % 10);
  const createdAt = `2024-05-${String(createdDay).padStart(2, '0')}T08:00:00.000Z`;
  const dealValue = 50000 + index * 15000;

  const base: CompanyListItem = {
    id: `company-${index}`,
    name: overrides.name,
    industry: overrides.industry ?? INDUSTRIES[index % INDUSTRIES.length],
    status: overrides.status,
    phone: overrides.phone ?? `02-${55000000 + index}`,
    email: overrides.email ?? `info@${overrides.name.toLowerCase().replace(/\s+/g, '')}.com`,
    contactCount: overrides.contactCount ?? 1 + (index % 5),
    dealValue: overrides.dealValue ?? dealValue,
    assignedAgentName: overrides.assignedAgentName ?? AGENTS[index % AGENTS.length],
    city: overrides.city ?? 'Dhaka',
    createdAt,
  };

  return {
    ...base,
    address: `Plot ${index + 10}, ${base.city}`,
    website: `https://www.${base.name.toLowerCase().replace(/\s+/g, '')}.com`,
    notes: index % 3 === 0 ? 'Key account — quarterly review.' : undefined,
    tags: index % 2 === 0 ? ['Enterprise'] : [],
    contactIds: Array.from({ length: base.contactCount }, (_, i) => `contact-${index * 10 + i}`),
    dealIds: [`deal-${index}`, `deal-${index + 100}`],
  };
}

export const MOCK_COMPANIES: CompanyDetail[] = [
  buildCompany(1, { name: 'Akash Traders', status: 'active' }),
  buildCompany(2, { name: 'Green Valley Ltd', status: 'active' }),
  buildCompany(3, { name: 'Dhaka Mart', status: 'prospect' }),
  buildCompany(4, { name: 'Star Electronics', status: 'active' }),
  buildCompany(5, { name: 'Premium Foods', status: 'active' }),
  buildCompany(6, { name: 'City Wholesale', status: 'prospect' }),
  buildCompany(7, { name: 'Metro Supplies', status: 'inactive' }),
  buildCompany(8, { name: 'Royal Traders', status: 'active' }),
  buildCompany(9, { name: 'Nova Retail', status: 'prospect' }),
  buildCompany(10, { name: 'Summit Corp', status: 'active' }),
];

export function getMockCompanyById(id: string): CompanyDetail | undefined {
  return MOCK_COMPANIES.find((c) => c.id === id);
}

export function filterMockCompanies(query: CompanyListQuery): CompanyListResponse {
  const search = query.search?.trim().toLowerCase() ?? '';
  const allMatching = MOCK_COMPANIES.filter((company) => {
    if (query.status && company.status !== query.status) return false;
    if (!search) return true;
    return (
      company.name.toLowerCase().includes(search) ||
      (company.industry?.toLowerCase().includes(search) ?? false) ||
      (company.city?.toLowerCase().includes(search) ?? false)
    );
  });

  const total = allMatching.length;
  const totalDealValue = allMatching.reduce((sum, c) => sum + c.dealValue, 0);
  const activeCount = allMatching.filter((c) => c.status === 'active').length;
  const start = (query.page - 1) * query.pageSize;

  return {
    items: allMatching.slice(start, start + query.pageSize).map(
      ({ contactIds: _c, dealIds: _d, notes: _n, tags: _t, address: _a, website: _w, ...listItem }) =>
        listItem,
    ),
    total,
    page: query.page,
    pageSize: query.pageSize,
    summary: { count: total, totalDealValue, activeCount },
  };
}

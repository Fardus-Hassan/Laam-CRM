import type {
  CompanyDetail,
  CompanyListItem,
  CompanyListQuery,
  CompanyListResponse,
  CompanyStatus,
} from '@laam/types';

const AGENTS = ['Sakib Ahmed', 'Mitu Rahman', 'Imran Hossain', 'Tania Sultana', 'Arif Mahmud'];

type CustomerSeed = {
  name: string;
  phone: string;
  area: string;
  district: string;
  orders: number;
  spent: number;
  status: CompanyStatus;
  tags: string[];
  notes?: string;
};

/** B2C repeat buyers — honey, dates & gift products. */
const CUSTOMER_SEED: CustomerSeed[] = [
  {
    name: 'Rahim Uddin',
    phone: '01711110001',
    area: 'Mirpur',
    district: 'Dhaka',
    orders: 6,
    spent: 4850,
    status: 'active',
    tags: ['Repeat', 'Modhu'],
    notes: 'Prefers evening delivery. COD regular.',
  },
  {
    name: 'Fatema Akter',
    phone: '01822220002',
    area: 'Uttara',
    district: 'Dhaka',
    orders: 3,
    spent: 2400,
    status: 'active',
    tags: ['Khejur', 'Ramadan'],
  },
  {
    name: 'Karim Hassan',
    phone: '01933330003',
    area: 'Dhanmondi',
    district: 'Dhaka',
    orders: 1,
    spent: 850,
    status: 'prospect',
    tags: ['New'],
    notes: 'First order from Facebook ad.',
  },
  {
    name: 'Nusrat Jahan',
    phone: '01644440004',
    area: 'Banani',
    district: 'Dhaka',
    orders: 8,
    spent: 9200,
    status: 'active',
    tags: ['VIP', 'Gift Buyer'],
  },
  {
    name: 'Kabir Hossain',
    phone: '01555550005',
    area: 'Gulshan',
    district: 'Dhaka',
    orders: 2,
    spent: 1650,
    status: 'active',
    tags: ['Repeat'],
  },
  {
    name: 'Rokeya Begum',
    phone: '01766660006',
    area: 'Mohammadpur',
    district: 'Dhaka',
    orders: 4,
    spent: 3100,
    status: 'active',
    tags: ['Modhu', 'COD Risk'],
    notes: 'Call before dispatch — often not at home.',
  },
  {
    name: 'Shamim Ahmed',
    phone: '01877770007',
    area: 'Bashundhara',
    district: 'Dhaka',
    orders: 1,
    spent: 1100,
    status: 'prospect',
    tags: ['Gift'],
  },
  {
    name: 'Farzana Akter',
    phone: '01988880008',
    area: 'Mirpur',
    district: 'Dhaka',
    orders: 0,
    spent: 0,
    status: 'inactive',
    tags: [],
    notes: 'No order in 90+ days.',
  },
  {
    name: 'Anika Rahman',
    phone: '01699990009',
    area: 'Chawkbazar',
    district: 'Chittagong',
    orders: 5,
    spent: 5400,
    status: 'active',
    tags: ['Repeat', 'Khejur'],
  },
  {
    name: 'Tanvir Hossain',
    phone: '01710101010',
    area: 'Zindabazar',
    district: 'Sylhet',
    orders: 2,
    spent: 1980,
    status: 'active',
    tags: ['Modhu'],
  },
  {
    name: 'Lamia Akter',
    phone: '01812121212',
    area: 'Tongi',
    district: 'Gazipur',
    orders: 1,
    spent: 650,
    status: 'prospect',
    tags: ['New', 'Ramadan'],
  },
  {
    name: 'Mehedi Hasan',
    phone: '01913131313',
    area: 'Agrabad',
    district: 'Chittagong',
    orders: 7,
    spent: 7600,
    status: 'active',
    tags: ['VIP', 'Repeat'],
  },
];

function buildCompany(index: number, seed: CustomerSeed): CompanyDetail {
  const createdDay = 20 - (index % 10);
  const createdAt = `2024-05-${String(createdDay).padStart(2, '0')}T08:00:00.000Z`;

  const base: CompanyListItem = {
    id: `company-${index}`,
    name: seed.name,
    industry: seed.area,
    status: seed.status,
    phone: seed.phone,
    email: `${seed.name.split(' ')[0].toLowerCase()}@gmail.com`,
    contactCount: seed.orders,
    dealValue: seed.spent,
    assignedAgentName: AGENTS[index % AGENTS.length],
    city: seed.district,
    createdAt,
  };

  return {
    ...base,
    address: `House ${index + 4}, ${seed.area}, ${seed.district}`,
    notes: seed.notes,
    tags: seed.tags,
    contactIds: [],
    dealIds: [],
  };
}

export const MOCK_COMPANIES: CompanyDetail[] = CUSTOMER_SEED.map((seed, index) =>
  buildCompany(index + 1, seed),
);

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
      (company.phone?.includes(search) ?? false) ||
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

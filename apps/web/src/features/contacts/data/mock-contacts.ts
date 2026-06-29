import type {
  ContactDetail,
  ContactListItem,
  ContactListQuery,
  ContactListResponse,
} from '@laam/types';

const AGENTS = ['Sakib Ahmed', 'Mitu Rahman', 'Imran Hossain', 'Tania Sultana'];
const COMPANIES = ['Akash Traders', 'Green Valley Ltd', 'Dhaka Mart', 'Star Electronics', undefined];

function buildContact(
  index: number,
  overrides: Partial<ContactListItem> & Pick<ContactListItem, 'name'>,
): ContactDetail {
  const source = (['facebook', 'call', 'ecommerce', 'walk_in'] as const)[index % 4];
  const createdDay = 25 - (index % 12);
  const createdAt = `2024-05-${String(createdDay).padStart(2, '0')}T11:${String(index % 60).padStart(2, '0')}:00.000Z`;

  const base: ContactListItem = {
    id: `contact-${index}`,
    name: overrides.name,
    phone: `01${String(720000000 + index).slice(0, 9)}`,
    email: overrides.email ?? `${overrides.name.split(' ')[0].toLowerCase()}@email.com`,
    companyName: overrides.companyName ?? COMPANIES[index % COMPANIES.length],
    jobTitle: overrides.jobTitle ?? (index % 2 === 0 ? 'Owner' : 'Manager'),
    source: overrides.source ?? source,
    assignedAgentName: overrides.assignedAgentName ?? AGENTS[index % AGENTS.length],
    lastContactAt: overrides.lastContactAt ?? createdAt,
    createdAt,
  };

  return {
    ...base,
    address: `House ${index + 5}, Dhaka`,
    tags: index % 3 === 0 ? ['VIP'] : [],
    notes: index % 4 === 0 ? 'Prefers WhatsApp contact.' : undefined,
    companyId: base.companyName ? `company-${(index % 5) + 1}` : undefined,
    leadId: index % 2 === 0 ? `lead-${index}` : undefined,
    activities: [
      {
        id: `${base.id}-a1`,
        type: 'call',
        label: 'Outbound call',
        description: 'Discussed product pricing',
        timestamp: base.lastContactAt ?? base.createdAt,
        actorName: base.assignedAgentName,
      },
      {
        id: `${base.id}-a2`,
        type: 'note',
        label: 'Note added',
        description: 'Interested in bulk order',
        timestamp: base.createdAt,
        actorName: base.assignedAgentName,
      },
    ],
  };
}

export const MOCK_CONTACTS: ContactDetail[] = [
  buildContact(1, { name: 'Rahim Uddin', companyName: 'Akash Traders' }),
  buildContact(2, { name: 'Fatema Akter' }),
  buildContact(3, { name: 'Karim Hassan', source: 'facebook' }),
  buildContact(4, { name: 'Nusrat Jahan', companyName: 'Green Valley Ltd' }),
  buildContact(5, { name: 'Sakib Ahmed', source: 'call' }),
  buildContact(6, { name: 'Mitu Rahman' }),
  buildContact(7, { name: 'Imran Hossain', source: 'ecommerce' }),
  buildContact(8, { name: 'Tania Sultana', companyName: 'Dhaka Mart' }),
  buildContact(9, { name: 'Arif Mahmud' }),
  buildContact(10, { name: 'Hasan Ali', source: 'facebook' }),
  buildContact(11, { name: 'Sabrina Khan' }),
  buildContact(12, { name: 'Rafiq Islam', companyName: 'Star Electronics' }),
  buildContact(13, { name: 'Jannatul Ferdous' }),
  buildContact(14, { name: 'Omar Faruk', source: 'call' }),
  buildContact(15, { name: 'Priya Das' }),
];

export function getMockContactById(id: string): ContactDetail | undefined {
  return MOCK_CONTACTS.find((contact) => contact.id === id);
}

export function filterMockContacts(query: ContactListQuery): ContactListResponse {
  const search = query.search?.trim().toLowerCase() ?? '';
  const allMatching = MOCK_CONTACTS.filter((contact) => {
    if (query.source && contact.source !== query.source) {
      return false;
    }
    if (!search) {
      return true;
    }
    return (
      contact.name.toLowerCase().includes(search) ||
      contact.phone.includes(search) ||
      (contact.email?.toLowerCase().includes(search) ?? false) ||
      (contact.companyName?.toLowerCase().includes(search) ?? false)
    );
  });

  const total = allMatching.length;
  const withCompanyCount = allMatching.filter((c) => c.companyName).length;
  const start = (query.page - 1) * query.pageSize;
  const pageItems = allMatching.slice(start, start + query.pageSize);

  return {
    items: pageItems.map(
      ({ activities: _a, notes: _n, tags: _t, address: _addr, ...listItem }) => listItem,
    ),
    total,
    page: query.page,
    pageSize: query.pageSize,
    summary: { count: total, withCompanyCount },
  };
}

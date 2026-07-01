import type {
  FailedOrderListQuery,
  FailedOrderListResponse,
  FailedOrderListItem,
} from '@laam/types';

const WEBSITES = ['laambd.com', 'laam.com.bd', 'laambd.shop', 'laambd.co'];

const NAMES = [
  'আসিফ', 'রফিক', 'কামরুল', 'সাবrina', 'নাসির', 'রুবাইয়া', 'ইমরান', 'ফারহানা',
  'জাহিদ', 'মিতু', 'আরিফ', 'সালমা', 'করিম', 'নুসরাত', 'তানভীর',
];

const PRODUCTS = [
  'কালোজিরা রসুন মধু এবং ইরানি জাফরান মশলা এক কেজি',
  'কালোজিরা ফুলের মধু ৫০০গ্রাম',
  'মিক্সড নাটস ২৫০গ্রাম',
  'প্রিমিয়াম খেজুর ৫০০গ্রাম',
  'অর্গানিক মধু ১ কেজি',
];

const ADDRESSES = [
  'জেলা চট্টগ্রাম, থানা ফটিকছড়ি',
  'ঢাকা, মিরপুর',
  'সিলেট, জকিগঞ্জ',
  'ঢাকা, গুলশান',
  'চট্টগ্রাম, পাহাড়তলী',
];

function buildFailedOrder(index: number): FailedOrderListItem {
  const types = ['duplicate', 'blocked', 'other'] as const;
  return {
    id: `failed-${index}`,
    customerName: NAMES[index % NAMES.length],
    customerPhone: `01${String(700000000 + index).slice(0, 9)}`,
    address: ADDRESSES[index % ADDRESSES.length],
    products: [PRODUCTS[index % PRODUCTS.length]],
    status: 'pending',
    failedType: types[index % types.length],
    website: WEBSITES[index % WEBSITES.length],
    lastUpdateNote: index % 2 === 0 ? 'Courier Success Score are 0' : undefined,
    createdAt: new Date(Date.now() - index * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - index * 43200000).toISOString(),
  };
}

export const mockFailedOrderStore: FailedOrderListItem[] = Array.from({ length: 15 }, (_, i) =>
  buildFailedOrder(i + 1),
);

export function filterMockFailedOrders(query: FailedOrderListQuery): FailedOrderListResponse {
  const search = query.search?.trim().toLowerCase() ?? '';
  let items = mockFailedOrderStore.filter((order) => {
    if (query.failedType && order.failedType !== query.failedType) {
      return false;
    }
    if (query.website && query.website !== 'all' && order.website !== query.website) {
      return false;
    }
    if (query.noteStatus === 'has_note' && !order.lastUpdateNote) {
      return false;
    }
    if (query.noteStatus === 'no_note' && order.lastUpdateNote) {
      return false;
    }
    if (!search) {
      return true;
    }
    return (
      order.customerName.toLowerCase().includes(search) ||
      order.customerPhone.includes(search) ||
      order.address.toLowerCase().includes(search)
    );
  });

  const total = items.length;
  const start = (query.page - 1) * query.pageSize;
  items = items.slice(start, start + query.pageSize);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    report: {
      totalTracked: mockFailedOrderStore.length,
      confirmed: Math.round(mockFailedOrderStore.length * 0.12),
      failedToConfirmedPercent: 4.44,
    },
  };
}

export function retryMockFailedOrder(id: string): { success: boolean; message: string } {
  const index = mockFailedOrderStore.findIndex((o) => o.id === id);
  if (index < 0) {
    return { success: false, message: 'Failed order not found' };
  }
  mockFailedOrderStore.splice(index, 1);
  return { success: true, message: 'Order retried and moved to pending queue' };
}

export function dismissMockFailedOrder(id: string): boolean {
  const index = mockFailedOrderStore.findIndex((o) => o.id === id);
  if (index < 0) {
    return false;
  }
  mockFailedOrderStore.splice(index, 1);
  return true;
}

export { WEBSITES as FAILED_ORDER_WEBSITES };

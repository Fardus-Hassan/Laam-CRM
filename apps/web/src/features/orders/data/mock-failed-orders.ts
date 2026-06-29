import type {
  FailedOrderListQuery,
  FailedOrderListResponse,
  FailedOrderListItem,
} from '@laam/types';

const WEBSITES = ['laambd.com', 'laam.com.bd', 'laambd.shop', 'laambd.co'];

const MOCK_FAILED_ORDERS: FailedOrderListItem[] = [
  {
    id: 'failed-1',
    customerName: 'আসিফ',
    customerPhone: '01402125992',
    address: 'জেলা চট্টগ্রাম, থানা ফটিকছড়ি',
    products: ['কালোজিরা রসুন মধু এবং ইরানি জাফরান মশলা এক কেজি'],
    status: 'pending',
    failedType: 'duplicate',
    website: 'laambd.shop',
    lastUpdateNote: 'Courier Success Score are 0',
    createdAt: '2026-06-29T12:03:00.000Z',
    updatedAt: '2026-06-29T12:03:00.000Z',
  },
  {
    id: 'failed-2',
    customerName: 'রফিক',
    customerPhone: '01715003479',
    address: 'ঢাকা, মিরপুর',
    products: ['কালোজিরা ফুলের মধু ৫০০গ্রাম'],
    status: 'pending',
    failedType: 'blocked',
    website: 'laambd.com',
    lastUpdateNote: 'Invalid OTP!',
    createdAt: '2026-06-28T09:15:00.000Z',
    updatedAt: '2026-06-29T10:20:00.000Z',
  },
  {
    id: 'failed-3',
    customerName: 'কামরুল',
    customerPhone: '01812345678',
    address: 'সিলেট, জকিগঞ্জ',
    products: ['মিক্সড নাটস ২৫০গ্রাম'],
    status: 'pending',
    failedType: 'other',
    website: 'laambd.co',
    createdAt: '2026-06-27T14:30:00.000Z',
    updatedAt: '2026-06-27T14:30:00.000Z',
  },
];

export function filterMockFailedOrders(query: FailedOrderListQuery): FailedOrderListResponse {
  const search = query.search?.trim().toLowerCase() ?? '';
  let items = MOCK_FAILED_ORDERS.filter((order) => {
    if (query.failedType && order.failedType !== query.failedType) {
      return false;
    }
    if (query.website && query.website !== 'all' && order.website !== query.website) {
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
      totalTracked: 34807,
      confirmed: 1546,
      failedToConfirmedPercent: 4.44,
    },
  };
}

export { WEBSITES as FAILED_ORDER_WEBSITES };

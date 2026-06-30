import type { OrderSource } from '@laam/types';

import { MOCK_ORDERS } from '@/features/orders/data/mock-orders';
import {
  MOCK_PRODUCTS,
  type MockProduct,
  type MockProductVariation,
} from '@/features/orders/data/mock-products';
import type { CustomerLookupStats } from '@/features/orders/lib/create-order-types';

export type { MockProduct, MockProductVariation };
export { MOCK_PRODUCTS };

export type MockCustomerProfile = {
  mobile: string;
  name: string;
  email: string;
  address: string;
  district: string;
  orderSource: OrderSource;
  customerTag: string;
  stats: CustomerLookupStats;
};

export type PathaoCity = {
  id: string;
  name: string;
  zones: PathaoZone[];
};

export type PathaoZone = {
  id: string;
  name: string;
  areas: string[];
};

export const MOCK_DISTRICTS = [
  'Dhaka',
  'Chittagong',
  'Sylhet',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Rangpur',
  'Mymensingh',
  'Gazipur',
  'Narayanganj',
];

export const MOCK_ORDER_TAGS = ['VIP', 'Repeat', 'Risk', 'New', 'Wholesale'];

export const MOCK_ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'pending_2', label: 'Pending 2' },
  { value: 'pending_3', label: 'Pending 3' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'hold', label: 'On Hold' },
];

export const MOCK_PAYMENT_METHODS = [
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'card', label: 'Card' },
];

export const PATHAO_GEO: PathaoCity[] = [
  {
    id: 'dhaka',
    name: 'Dhaka',
    zones: [
      {
        id: 'dhaka-north',
        name: 'Dhaka North',
        areas: ['Uttara', 'Banani', 'Gulshan', 'Mirpur', 'Mohakhali'],
      },
      {
        id: 'dhaka-south',
        name: 'Dhaka South',
        areas: ['Dhanmondi', 'Mohammadpur', 'Lalbagh', 'Old Dhaka', 'Jatrabari'],
      },
    ],
  },
  {
    id: 'chittagong',
    name: 'Chittagong',
    zones: [
      {
        id: 'ctg-city',
        name: 'Chittagong City',
        areas: ['Agrabad', 'Halishahar', 'Pahartali', 'Nasirabad'],
      },
    ],
  },
  {
    id: 'sylhet',
    name: 'Sylhet',
    zones: [
      {
        id: 'sylhet-city',
        name: 'Sylhet City',
        areas: ['Zindabazar', 'Ambarkhana', 'Shibgonj'],
      },
    ],
  },
];

export const VALID_COUPON_CODE = 'SAVE10';

export const DEFAULT_COURIER_NOTE =
  'পার্সেল খোলা যাবে না — মার্চেন্টকে জানানো ছাড়া খুলবেন না। কাস্টমার কল না ধরলে পার্সেল ক্যান্সেল করবেন না।';

function buildCustomerProfiles(): MockCustomerProfile[] {
  const byPhone = new Map<string, MockCustomerProfile>();

  for (const order of MOCK_ORDERS) {
    const existing = byPhone.get(order.customerPhone);

    if (!existing) {
      byPhone.set(order.customerPhone, {
        mobile: order.customerPhone,
        name: order.customerName,
        email: order.customerEmail ?? '',
        address: order.shippingAddress,
        district: 'Dhaka',
        orderSource: order.source,
        customerTag: order.source === 'facebook' ? 'Repeat' : 'New',
        stats: {
          totalOrders: 1,
          completedDelivered: order.status === 'delivered' || order.status === 'completed' ? 1 : 0,
        },
      });
      continue;
    }

    existing.stats.totalOrders += 1;
    if (order.status === 'delivered' || order.status === 'completed') {
      existing.stats.completedDelivered += 1;
    }
  }

  return [...byPhone.values()];
}

let customerProfilesCache: MockCustomerProfile[] | null = null;

function getCustomerProfiles(): MockCustomerProfile[] {
  if (!customerProfilesCache) {
    customerProfilesCache = buildCustomerProfiles();
  }
  return customerProfilesCache;
}

export function lookupCustomerByMobile(mobile: string): MockCustomerProfile | null {
  const normalized = mobile.replace(/\D/g, '');
  if (normalized.length < 11) {
    return null;
  }

  return (
    getCustomerProfiles().find(
      (profile) => profile.mobile.replace(/\D/g, '') === normalized,
    ) ?? null
  );
}

export function searchProducts(query: string): MockProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return MOCK_PRODUCTS;
  }

  return MOCK_PRODUCTS.filter(
    (product) =>
      product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q),
  );
}

export function getProductById(id: string): MockProduct | undefined {
  return MOCK_PRODUCTS.find((product) => product.id === id);
}

export function searchDistricts(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return MOCK_DISTRICTS;
  }

  return MOCK_DISTRICTS.filter((district) => district.toLowerCase().includes(q));
}

export function filterPathaoAreas(
  cityId: string,
  zoneId: string,
  search: string,
): string[] {
  const city = PATHAO_GEO.find((item) => item.id === cityId);
  const zone = city?.zones.find((item) => item.id === zoneId);
  if (!zone) {
    return [];
  }

  const q = search.trim().toLowerCase();
  if (!q) {
    return zone.areas;
  }

  return zone.areas.filter((area) => area.toLowerCase().includes(q));
}

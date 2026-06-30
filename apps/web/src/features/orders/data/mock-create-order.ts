import type { OrderSource } from '@laam/types';

import { MOCK_ORDERS } from '@/features/orders/data/mock-orders';
import type { CustomerLookupStats } from '@/features/orders/lib/create-order-types';

export type MockProductVariation = {
  id: string;
  label: string;
  unitPrice: number;
};

export type MockProduct = {
  id: string;
  name: string;
  sku: string;
  imageUrl: string;
  variations: MockProductVariation[];
};

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

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 'prod-1',
    name: 'Premium Dates 500g',
    sku: 'DAT-500',
    imageUrl:
      'https://images.unsplash.com/photo-1626082927389-6dd097586060?w=120&h=120&fit=crop',
    variations: [
      { id: 'v1', label: 'Regular', unitPrice: 850 },
      { id: 'v2', label: 'Gift Pack', unitPrice: 950 },
    ],
  },
  {
    id: 'prod-2',
    name: 'Mixed Nuts 250g',
    sku: 'NUT-250',
    imageUrl:
      'https://images.unsplash.com/photo-1599599810769-bcde5a160d24?w=120&h=120&fit=crop',
    variations: [
      { id: 'v1', label: 'Salted', unitPrice: 620 },
      { id: 'v2', label: 'Unsalted', unitPrice: 600 },
    ],
  },
  {
    id: 'prod-3',
    name: 'Organic Honey 350ml',
    sku: 'HON-350',
    imageUrl:
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=120&h=120&fit=crop',
    variations: [{ id: 'v1', label: 'Standard', unitPrice: 780 }],
  },
  {
    id: 'prod-4',
    name: 'Gift Hamper Deluxe',
    sku: 'HAM-DLX',
    imageUrl:
      'https://images.unsplash.com/photo-1549465220-1a75b6dd9355?w=120&h=120&fit=crop',
    variations: [
      { id: 'v1', label: 'Small', unitPrice: 2200 },
      { id: 'v2', label: 'Large', unitPrice: 3500 },
    ],
  },
  {
    id: 'prod-5',
    name: 'Arabian Attar 12ml',
    sku: 'ATT-12',
    imageUrl:
      'https://images.unsplash.com/photo-1592945403244-b3fbafd19f2b?w=120&h=120&fit=crop',
    variations: [
      { id: 'v1', label: 'Oud', unitPrice: 1200 },
      { id: 'v2', label: 'Musk', unitPrice: 1100 },
    ],
  },
  {
    id: 'prod-6',
    name: 'Basmati Rice 5kg',
    sku: 'RCE-5K',
    imageUrl:
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=120&h=120&fit=crop',
    variations: [{ id: 'v1', label: 'Premium', unitPrice: 980 }],
  },
  {
    id: 'prod-7',
    name: 'Saffron 1g',
    sku: 'SAF-1G',
    imageUrl:
      'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=120&h=120&fit=crop',
    variations: [{ id: 'v1', label: 'Spanish', unitPrice: 450 }],
  },
  {
    id: 'prod-8',
    name: 'Black Seed Oil 100ml',
    sku: 'BSO-100',
    imageUrl:
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=120&h=120&fit=crop',
    variations: [{ id: 'v1', label: 'Cold Pressed', unitPrice: 520 }],
  },
  {
    id: 'prod-9',
    name: 'Dried Mango 200g',
    sku: 'MNG-200',
    imageUrl:
      'https://images.unsplash.com/photo-1553279768-865429fa0078?w=120&h=120&fit=crop',
    variations: [{ id: 'v1', label: 'Sweet', unitPrice: 320 }],
  },
  {
    id: 'prod-10',
    name: 'Green Tea Box',
    sku: 'TEA-GRN',
    imageUrl:
      'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=120&h=120&fit=crop',
    variations: [
      { id: 'v1', label: '25 bags', unitPrice: 280 },
      { id: 'v2', label: '50 bags', unitPrice: 490 },
    ],
  },
];

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

const CUSTOMER_PROFILES = buildCustomerProfiles();

export function lookupCustomerByMobile(mobile: string): MockCustomerProfile | null {
  const normalized = mobile.replace(/\D/g, '');
  if (normalized.length < 11) {
    return null;
  }

  return (
    CUSTOMER_PROFILES.find((profile) => profile.mobile.replace(/\D/g, '') === normalized) ??
    null
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

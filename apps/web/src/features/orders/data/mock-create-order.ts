import type { OrderSource } from '@laam/types';

import { getActiveCouponByCode, listCoupons } from '@/features/coupons/data/mock-coupons';
import { MOCK_INVENTORY_PRODUCTS } from '@/features/inventory/data/mock-inventory';
import { MOCK_ORDERS } from '@/features/orders/data/mock-orders';
import {
  HERO_PRODUCT_ID,
  isHeroProduct,
  isUpsellProduct,
  MOCK_PRODUCTS as SEED_PRODUCTS,
  type MockProduct,
  type MockProductVariation,
} from '@/features/orders/data/mock-products';
import type { CustomerLookupStats } from '@/features/orders/lib/create-order-types';

export type { MockProduct, MockProductVariation };

/** Order catalog = live inventory products (single source of truth). */
export function getOrderCatalogProducts(): MockProduct[] {
  const seedById = new Map(SEED_PRODUCTS.map((p) => [p.id, p]));
  return MOCK_INVENTORY_PRODUCTS.filter((p) => p.status === 'active')
    .map((p) => {
      const seed = seedById.get(p.id);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        imageUrl: p.imageUrl ?? '',
        isHero: seed?.isHero ?? isHeroProduct(p),
        isUpsell: seed?.isUpsell ?? isUpsellProduct({ id: p.id, isUpsell: seed?.isUpsell, isHero: seed?.isHero }),
        variations:
          p.variants.length > 0
            ? p.variants.map((v) => ({
                id: v.id,
                label: v.label,
                unitPrice: v.salePrice,
              }))
            : [{ id: `${p.id}-default`, label: 'Default', unitPrice: p.salePriceMin }],
      };
    })
    .sort((a, b) => Number(Boolean(b.isHero)) - Number(Boolean(a.isHero)));
}

export { HERO_PRODUCT_ID, isHeroProduct, isUpsellProduct };

/** Snapshot for seed consumers — prefer getOrderCatalogProducts() at runtime. */
export const MOCK_PRODUCTS = getOrderCatalogProducts();

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

export const MOCK_ORDER_TAGS = ['VIP', 'Repeat', 'COD Risk', 'New', 'Ramadan', 'Gift Buyer'];

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

/** Active promo codes from coupons module. */
export function getValidCouponCodes(): string[] {
  return listCoupons().filter((c) => c.isActive).map((c) => c.code);
}

export const VALID_COUPON_CODES = ['RAMADAN10', 'FIRST100', 'COMBO50', 'SAVE10'] as const;

/** @deprecated Use getValidCouponCodes / isValidCouponCode */
export const VALID_COUPON_CODE = 'RAMADAN10';

export function isValidCouponCode(code: string): boolean {
  if (getActiveCouponByCode(code)) return true;
  // Legacy demo code
  return code.trim().toUpperCase() === 'SAVE10';
}

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
  const catalog = getOrderCatalogProducts();
  const q = query.trim().toLowerCase();
  if (!q) {
    return catalog;
  }

  return catalog.filter(
    (product) =>
      product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q),
  );
}

export function getProductById(id: string): MockProduct | undefined {
  return getOrderCatalogProducts().find((product) => product.id === id);
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

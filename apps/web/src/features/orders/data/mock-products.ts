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
  /** Hero SKU — ~90% of daily sales (honey + kalojira mix). */
  isHero?: boolean;
  /** Suggested add-on when hero is in cart. */
  isUpsell?: boolean;
};

const HONEY_IMG =
  'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=120&h=120&fit=crop';
const POWDER_IMG =
  'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=120&h=120&fit=crop';
const SALT_IMG =
  'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=120&h=120&fit=crop';
const GIFT_IMG =
  'https://images.unsplash.com/photo-1549465220-1a75b6dd9355?w=120&h=120&fit=crop';

/**
 * B2C catalog — Honey + Kalojira Mix is the hero (~90% of sales).
 * Other lines are upsell / attach products with multiple variants.
 */
export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 'prod-hero-mix',
    name: 'Honey + Kalojira Mix',
    sku: 'HKM-MIX',
    imageUrl: HONEY_IMG,
    isHero: true,
    variations: [
      { id: 'hkm-500', label: '500g', unitPrice: 890 },
      { id: 'hkm-1k', label: '1kg', unitPrice: 1650 },
    ],
  },
  {
    id: 'prod-pink-salt',
    name: 'Pink Salt',
    sku: 'PNK-SLT',
    imageUrl: SALT_IMG,
    isUpsell: true,
    variations: [
      { id: 'pnk-250', label: '250g', unitPrice: 220 },
      { id: 'pnk-500', label: '500g', unitPrice: 380 },
      { id: 'pnk-1k', label: '1kg', unitPrice: 680 },
    ],
  },
  {
    id: 'prod-beetroot',
    name: 'Beetroot Powder',
    sku: 'BTR-PWD',
    imageUrl: POWDER_IMG,
    isUpsell: true,
    variations: [
      { id: 'btr-100', label: '100g', unitPrice: 280 },
      { id: 'btr-250', label: '250g', unitPrice: 520 },
      { id: 'btr-500', label: '500g', unitPrice: 950 },
    ],
  },
  {
    id: 'prod-pure-honey',
    name: 'Pure Honey',
    sku: 'MDH-PURE',
    imageUrl: HONEY_IMG,
    isUpsell: true,
    variations: [
      { id: 'mdh-350', label: '350g', unitPrice: 580 },
      { id: 'mdh-500', label: '500g', unitPrice: 780 },
      { id: 'mdh-1k', label: '1kg', unitPrice: 1450 },
    ],
  },
  {
    id: 'prod-kalojira-powder',
    name: 'Kalojira Powder',
    sku: 'KLJ-PWD',
    imageUrl: POWDER_IMG,
    isUpsell: true,
    variations: [
      { id: 'klj-100', label: '100g', unitPrice: 180 },
      { id: 'klj-250', label: '250g', unitPrice: 350 },
      { id: 'klj-500', label: '500g', unitPrice: 620 },
    ],
  },
  {
    id: 'prod-moringa',
    name: 'Moringa Powder',
    sku: 'MRG-PWD',
    imageUrl: POWDER_IMG,
    isUpsell: true,
    variations: [
      { id: 'mrg-100', label: '100g', unitPrice: 240 },
      { id: 'mrg-250', label: '250g', unitPrice: 450 },
    ],
  },
  {
    id: 'prod-gift-box',
    name: 'Wellness Gift Box',
    sku: 'WLS-GFT',
    imageUrl: GIFT_IMG,
    isUpsell: true,
    variations: [
      { id: 'wls-std', label: 'Standard', unitPrice: 2200 },
      { id: 'wls-dlx', label: 'Deluxe', unitPrice: 3200 },
    ],
  },
  {
    id: 'prod-raw-honey',
    name: 'Bulk Honey (raw)',
    sku: 'RAW-HNY',
    imageUrl: HONEY_IMG,
    variations: [
      { id: 'raw-5k', label: '5kg', unitPrice: 4200 },
      { id: 'raw-10k', label: '10kg', unitPrice: 8000 },
    ],
  },
];

export const HERO_PRODUCT_ID = 'prod-hero-mix';

export function isHeroProduct(product: Pick<MockProduct, 'id' | 'isHero' | 'sku'>): boolean {
  return Boolean(product.isHero) || product.id === HERO_PRODUCT_ID || product.sku.startsWith('HKM');
}

export function isUpsellProduct(product: Pick<MockProduct, 'id' | 'isUpsell' | 'isHero'>): boolean {
  if (product.isHero) return false;
  return Boolean(product.isUpsell);
}

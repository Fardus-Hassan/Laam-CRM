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

/** Honey, dates & natural food — B2C catalog for normal retail buyers. */
export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 'prod-1',
    name: 'Khejur (Dates) 500g',
    sku: 'KHJ-500',
    imageUrl:
      'https://images.unsplash.com/photo-1626082927389-6dd097586060?w=120&h=120&fit=crop',
    variations: [
      { id: 'v1', label: 'Regular', unitPrice: 650 },
      { id: 'v2', label: 'Premium', unitPrice: 850 },
    ],
  },
  {
    id: 'prod-2',
    name: 'Modhu (Honey) 350ml',
    sku: 'MDH-350',
    imageUrl:
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=120&h=120&fit=crop',
    variations: [
      { id: 'v1', label: 'Standard', unitPrice: 580 },
      { id: 'v2', label: 'Sundarban', unitPrice: 780 },
    ],
  },
  {
    id: 'prod-3',
    name: 'Ajwa Khejur 500g',
    sku: 'AJW-500',
    imageUrl:
      'https://images.unsplash.com/photo-1626082927389-6dd097586060?w=120&h=120&fit=crop',
    variations: [{ id: 'v1', label: 'Gift Pack', unitPrice: 1200 }],
  },
  {
    id: 'prod-4',
    name: 'Kalojira Modhu 250ml',
    sku: 'KLM-250',
    imageUrl:
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=120&h=120&fit=crop',
    variations: [{ id: 'v1', label: 'Standard', unitPrice: 450 }],
  },
  {
    id: 'prod-5',
    name: 'Modhu + Khejur Combo',
    sku: 'CMB-01',
    imageUrl:
      'https://images.unsplash.com/photo-1549465220-1a75b6dd9355?w=120&h=120&fit=crop',
    variations: [
      { id: 'v1', label: 'Small', unitPrice: 1100 },
      { id: 'v2', label: 'Family', unitPrice: 1850 },
    ],
  },
  {
    id: 'prod-6',
    name: 'Ramadan Gift Box',
    sku: 'RMD-GFT',
    imageUrl:
      'https://images.unsplash.com/photo-1549465220-1a75b6dd9355?w=120&h=120&fit=crop',
    variations: [
      { id: 'v1', label: 'Standard', unitPrice: 2200 },
      { id: 'v2', label: 'Deluxe', unitPrice: 3200 },
    ],
  },
  {
    id: 'prod-7',
    name: 'Sundarban Modhu 500ml',
    sku: 'SDM-500',
    imageUrl:
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=120&h=120&fit=crop',
    variations: [{ id: 'v1', label: 'Glass Jar', unitPrice: 950 }],
  },
  {
    id: 'prod-8',
    name: 'Dried Khejur 1kg',
    sku: 'DKJ-1K',
    imageUrl:
      'https://images.unsplash.com/photo-1626082927389-6dd097586060?w=120&h=120&fit=crop',
    variations: [{ id: 'v1', label: 'Bulk', unitPrice: 1400 }],
  },
];

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

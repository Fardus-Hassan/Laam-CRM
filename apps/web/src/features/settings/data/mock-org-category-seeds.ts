import type { OrgCategory, OrgCategoryKind } from '@laam/types';

import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '@/features/accounting/config/accounting-filters';

const PRODUCT_CATEGORY_SEEDS: Record<string, string> = {
  honey: 'Honey',
  dates: 'Dates',
  combo: 'Combo',
  gift: 'Gift box',
  raw_material: 'Raw material',
  packaging: 'Packaging',
  other: 'Other',
};

function seedCategory(
  kind: OrgCategoryKind,
  slug: string,
  label: string,
  sortOrder: number,
  isSystem = false,
): OrgCategory {
  return {
    id: `cat-${kind}-${slug}`,
    kind,
    slug,
    label,
    sortOrder,
    isActive: true,
    isSystem,
  };
}

export const SEED_ORG_CATEGORIES: OrgCategory[] = [
  ...(Object.entries(PRODUCT_CATEGORY_SEEDS) as [string, string][]).map(
    ([slug, label], index) => seedCategory('product', slug, label, index),
  ),
  ...INCOME_CATEGORIES.map((item, index) =>
    seedCategory(
      'income',
      item.id,
      item.label,
      index,
      ['order_sales', 'cod_collection'].includes(item.id),
    ),
  ),
  ...EXPENSE_CATEGORIES.map((item, index) =>
    seedCategory(
      'expense',
      item.id,
      item.label,
      index,
      ['courier', 'product_cost', 'inventory_writeoff'].includes(item.id),
    ),
  ),
  seedCategory('knowledge', 'general', 'General', 0, true),
  seedCategory('knowledge', 'delivery', 'Delivery', 1),
  seedCategory('knowledge', 'payment', 'Payment & COD', 2),
  seedCategory('knowledge', 'product', 'Products', 3),
  seedCategory('knowledge', 'returns', 'Returns', 4),
];

export const ORG_CATEGORY_KIND_LABELS: Record<OrgCategoryKind, string> = {
  product: 'Product categories',
  income: 'Income categories',
  expense: 'Expense categories',
  knowledge: 'Knowledge categories',
};

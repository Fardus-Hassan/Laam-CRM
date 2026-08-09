import type { OrgCategory, OrgCategoryKind, UpsertOrgCategoryPayload } from '@laam/types';

import {
  SEED_ORG_CATEGORIES,
} from '@/features/settings/data/mock-org-category-seeds';

const STORAGE_KEY = 'laam-org-categories-v1';

export const ORG_CATEGORIES_CHANGED = 'laam-org-categories-changed';

function loadOverrides(): OrgCategory[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OrgCategory[]) : [];
  } catch {
    return [];
  }
}

function saveOverrides(categories: OrgCategory[]): OrgCategory[] {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    window.dispatchEvent(new CustomEvent(ORG_CATEGORIES_CHANGED));
  }
  return categories;
}

function mergeCategories(kind: OrgCategoryKind): OrgCategory[] {
  const seeds = SEED_ORG_CATEGORIES.filter((item) => item.kind === kind);
  const overrides = loadOverrides().filter((item) => item.kind === kind);
  const overrideBySlug = new Map(overrides.map((item) => [item.slug, item]));
  const seedSlugs = new Set(seeds.map((item) => item.slug));

  const merged = seeds.map((seed) => {
    const override = overrideBySlug.get(seed.slug);
    return override ? { ...seed, ...override, id: seed.id } : seed;
  });

  const custom = overrides.filter((item) => !seedSlugs.has(item.slug));

  return [...merged, ...custom].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export function getOrgCategories(kind: OrgCategoryKind): OrgCategory[] {
  return mergeCategories(kind);
}

export function getAllOrgCategories(): OrgCategory[] {
  return (['product', 'income', 'expense', 'knowledge'] as OrgCategoryKind[]).flatMap(getOrgCategories);
}

export function getOrgCategoryLabel(kind: OrgCategoryKind, slug: string): string {
  const match = getOrgCategories(kind).find((item) => item.slug === slug);
  if (match) return match.label;
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getOrgCategoryOptions(kind: OrgCategoryKind): { value: string; label: string }[] {
  return getOrgCategories(kind)
    .filter((item) => item.isActive)
    .map((item) => ({ value: item.slug, label: item.label }));
}

export function upsertOrgCategory(input: UpsertOrgCategoryPayload): OrgCategory[] {
  const slug = input.slug.trim().replace(/\s+/g, '_').toLowerCase();
  if (!slug) {
    throw new Error('Category slug is required');
  }

  const seeds = SEED_ORG_CATEGORIES.filter((item) => item.kind === input.kind);
  const seed = seeds.find((item) => item.slug === slug);
  const overrides = loadOverrides().filter((item) => !(item.kind === input.kind && item.slug === slug));

  const next: OrgCategory = {
    id: input.id ?? seed?.id ?? `cat-${input.kind}-${slug}`,
    kind: input.kind,
    slug,
    label: input.label.trim(),
    description: input.description?.trim() || undefined,
    sortOrder: input.sortOrder ?? seed?.sortOrder ?? overrides.filter((i) => i.kind === input.kind).length,
    isActive: input.isActive ?? true,
    isSystem: seed?.isSystem ?? input.isSystem ?? false,
  };

  return saveOverrides([...overrides, next]);
}

export function deleteOrgCategory(kind: OrgCategoryKind, slug: string): OrgCategory[] {
  const seed = SEED_ORG_CATEGORIES.find((item) => item.kind === kind && item.slug === slug);
  if (seed?.isSystem) {
    throw new Error('System categories cannot be deleted');
  }

  const overrides = loadOverrides().filter((item) => !(item.kind === kind && item.slug === slug));
  return saveOverrides(overrides);
}

export function setOrgCategoryActive(
  kind: OrgCategoryKind,
  slug: string,
  isActive: boolean,
): OrgCategory[] {
  const current = getOrgCategories(kind).find((item) => item.slug === slug);
  if (!current) {
    throw new Error('Category not found');
  }

  return upsertOrgCategory({ ...current, isActive });
}

export function getProductCategoryLabels(): Record<string, string> {
  return Object.fromEntries(getOrgCategories('product').map((item) => [item.slug, item.label]));
}

export function getIncomeCategoryOptions() {
  return getOrgCategoryOptions('income');
}

export function getExpenseCategoryOptions() {
  return getOrgCategoryOptions('expense');
}

export function getKnowledgeCategoryOptions() {
  return getOrgCategoryOptions('knowledge');
}

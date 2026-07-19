'use client';

import * as React from 'react';

import type { OrgCategory, OrgCategoryKind } from '@laam/types';

import { orgCategoriesApi } from '@/features/settings/api/org-categories-api';

export function useOrgCategories(kind: OrgCategoryKind) {
  const [categories, setCategories] = React.useState<OrgCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCategories(await orgCategoriesApi.list(kind));
    } catch (cause) {
      setCategories([]);
      setError(cause instanceof Error ? cause.message : 'Could not load categories');
    } finally {
      setLoading(false);
    }
  }, [kind]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { categories, loading, error, refresh };
}

/** Slug-based options for filters and legacy forms. */
export function useOrgCategoryOptions(kind: OrgCategoryKind) {
  const { categories } = useOrgCategories(kind);
  return React.useMemo(
    () =>
      categories
        .filter((item) => item.isActive)
        .map((item) => ({ value: item.slug, label: item.label, id: item.id })),
    [categories],
  );
}

'use client';

import * as React from 'react';

import type { OrgCategoryKind } from '@laam/types';

import {
  getOrgCategories,
  ORG_CATEGORIES_CHANGED,
} from '@/features/settings/data/org-categories-store';

export function useOrgCategories(kind: OrgCategoryKind) {
  const [categories, setCategories] = React.useState(() => getOrgCategories(kind));

  React.useEffect(() => {
    function refresh() {
      setCategories(getOrgCategories(kind));
    }

    window.addEventListener(ORG_CATEGORIES_CHANGED, refresh);
    return () => window.removeEventListener(ORG_CATEGORIES_CHANGED, refresh);
  }, [kind]);

  return categories;
}

export function useOrgCategoryOptions(kind: OrgCategoryKind) {
  const categories = useOrgCategories(kind);
  return React.useMemo(
    () =>
      categories
        .filter((item) => item.isActive)
        .map((item) => ({ value: item.slug, label: item.label })),
    [categories],
  );
}

'use client';

import * as React from 'react';

import { ViewMoreButton } from '@/components/dashboard/view-more-button';

const DEFAULT_LIMIT = 3;

export function useViewMore<T>(items: T[], limit = DEFAULT_LIMIT) {
  const [expanded, setExpanded] = React.useState(false);
  const hasMore = items.length > limit;
  const visibleItems = expanded ? items : items.slice(0, limit);

  const footer =
    hasMore && !expanded ? (
      <ViewMoreButton
        remainingCount={items.length - limit}
        onClick={() => setExpanded(true)}
      />
    ) : null;

  return { visibleItems, footer, expanded, hasMore };
}

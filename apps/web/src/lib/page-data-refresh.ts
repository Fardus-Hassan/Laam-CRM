'use client';

import * as React from 'react';

/** Top-bar Refresh — current page should re-fetch and bypass soft cache. */
export const PAGE_DATA_REFRESH = 'laam:page-data-refresh';

export function requestPageDataRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PAGE_DATA_REFRESH));
}

/** Subscribe the active page to top-bar Refresh clicks. */
export function usePageDataRefresh(onRefresh: () => void): void {
  const onRefreshRef = React.useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  React.useEffect(() => {
    const handler = () => {
      onRefreshRef.current();
    };
    window.addEventListener(PAGE_DATA_REFRESH, handler);
    return () => window.removeEventListener(PAGE_DATA_REFRESH, handler);
  }, []);
}

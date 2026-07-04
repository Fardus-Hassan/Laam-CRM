'use client';

import * as React from 'react';

export type ListQueryState = {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
};

export type UseListQueryOptions = {
  defaultPageSize?: number;
};

export function useListQuery(options: UseListQueryOptions = {}) {
  const { defaultPageSize = 20 } = options;
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);
  const [sortBy, setSortBy] = React.useState<string | undefined>();
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc' | undefined>();
  const [search, setSearch] = React.useState('');

  const sort = sortBy ? { id: sortBy, desc: sortDir === 'desc' } : null;

  function onSortChange(next: { id: string; desc: boolean } | null) {
    setSortBy(next?.id);
    setSortDir(next ? (next.desc ? 'desc' : 'asc') : undefined);
    setPage(1);
  }

  function onPageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  function onSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  const query: ListQueryState = {
    page,
    pageSize,
    sortBy,
    sortDir,
    search: search || undefined,
  };

  return {
    page,
    pageSize,
    sort,
    search,
    query,
    setPage,
    setPageSize,
    onPageSizeChange,
    onSortChange,
    onSearchChange,
    setSearch,
  };
}

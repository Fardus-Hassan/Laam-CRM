'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { InventoryProductListItem, ProductStatus } from '@laam/types';
import { CrmPageActions } from '@/features/crm/components/crm-page-actions';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { EmptyState } from '@/components/layout/empty-state';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { InventorySubNav } from '@/features/inventory/components/inventory-sub-nav';
import { ProductDataTable } from '@/features/inventory/components/product-list/product-data-table';
import { ProductFilterChips } from '@/features/inventory/components/product-list/product-filter-chips';
import { ProductListToolbar } from '@/features/inventory/components/product-list/product-list-toolbar';
import { ProductSelectionBar } from '@/features/inventory/components/product-list/product-selection-bar';
import { ProductWorkspaceHeader } from '@/features/inventory/components/product-list/product-workspace-header';
import { useProductMutations } from '@/features/inventory/hooks/use-product-mutations';
import { useProductsList } from '@/features/inventory/hooks/use-products-list';
import { useOrgCategoryOptions } from '@/features/settings/hooks/use-org-categories';
import { productBrandsApi } from '@/features/settings/api/product-brands-api';
import { ActiveFilterChips } from '@/components/filters/active-filter-chips';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { CRM_PAGE_SIZE_OPTIONS } from '@/components/data-table/page-size-options';

const PAGE_SIZE_OPTIONS = [...CRM_PAGE_SIZE_OPTIONS];

export function ProductListShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { updateProduct, adjustStock } = useProductMutations();

  const filter = searchParams.get('filter') ?? 'all';
  const category = searchParams.get('category') ?? '';
  const brandId = searchParams.get('brandId') ?? '';
  const [search, setSearch] = React.useState(searchParams.get('search') ?? '');
  const [page, setPage] = React.useState(Number(searchParams.get('page') ?? 1));
  const [pageSize, setPageSize] = React.useState(Number(searchParams.get('pageSize') ?? 10));
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [listVersion, setListVersion] = React.useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = React.useState<Date | null>(null);
  const [brandOptions, setBrandOptions] = React.useState<{ value: string; label: string }[]>([]);
  const categoryOptions = useOrgCategoryOptions('product');

  const debouncedSearch = useDebouncedValue(search, 300);
  const searchParamsKey = searchParams.toString();

  React.useEffect(() => {
    void productBrandsApi.list().then((brands) => {
      setBrandOptions(
        brands
          .filter((b) => b.isActive)
          .map((b) => ({ value: b.id, label: b.name })),
      );
    });
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    if (debouncedSearch) params.set('search', debouncedSearch);
    else params.delete('search');
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (filter && filter !== 'all') params.set('filter', filter);
    else params.delete('filter');
    if (category) params.set('category', category);
    else params.delete('category');
    if (brandId) params.set('brandId', brandId);
    else params.delete('brandId');
    const next = params.toString();
    if (next !== searchParamsKey) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [brandId, category, debouncedSearch, filter, page, pageSize, pathname, router, searchParamsKey]);

  const { data, isLoading, error, refresh } = useProductsList(
    {
      filter: filter === 'all' ? undefined : (filter as 'low_stock' | 'out_of_stock' | 'active' | 'inactive'),
      category: category || undefined,
      brandId: brandId || undefined,
      search: debouncedSearch || undefined,
      page,
      pageSize,
    },
    listVersion,
  );

  React.useEffect(() => {
    if (data && !isLoading) setLastRefreshedAt(new Date());
  }, [data, isLoading]);

  const selectedRows = React.useMemo(
    () => (data?.items ?? []).filter((row) => selectedIds.has(row.id)),
    [data?.items, selectedIds],
  );

  const summaryItems = [
    { id: 'count', label: 'Products', value: data ? String(data.summary.count) : '—' },
    { id: 'low', label: 'Low stock', value: data ? String(data.summary.lowStockCount) : '—' },
    { id: 'out', label: 'Out of stock', value: data ? String(data.summary.outOfStockCount) : '—' },
    { id: 'value', label: 'Stock value', value: data ? formatCurrency(data.summary.totalStockValue) : '—' },
    { id: 'selected', label: 'Selected', value: String(selectedIds.size) },
  ];

  function handleRefresh() {
    setListVersion((v) => v + 1);
    void refresh();
  }

  function handleClearFilters() {
    setSearch('');
    setPage(1);
    router.replace('/dashboard/inventory/products');
  }

  function setQueryParam(key: 'category' | 'brandId' | 'filter', value: string) {
    const params = new URLSearchParams(searchParamsKey);
    if (key === 'filter') {
      if (value && value !== 'all') params.set('filter', value);
      else params.delete('filter');
    } else if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setPage(1);
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  const activeChips = React.useMemo(() => {
    const chips: { id: string; label: string }[] = [];
    if (filter && filter !== 'all') {
      const filterLabels: Record<string, string> = {
        low_stock: 'Low stock',
        out_of_stock: 'Out of stock',
        active: 'Active',
        inactive: 'Inactive',
      };
      chips.push({ id: 'filter', label: filterLabels[filter] ?? filter });
    }
    if (category) {
      chips.push({
        id: 'category',
        label: categoryOptions.find((o) => o.value === category)?.label ?? category,
      });
    }
    if (brandId) {
      chips.push({
        id: 'brandId',
        label: brandOptions.find((o) => o.value === brandId)?.label ?? brandId,
      });
    }
    if (debouncedSearch.trim()) {
      chips.push({ id: 'search', label: `Search: ${debouncedSearch.trim()}` });
    }
    return chips;
  }, [brandId, brandOptions, category, categoryOptions, debouncedSearch, filter]);

  async function patchRow(id: string, patch: Parameters<typeof inventoryApi.updateProduct>[1]) {
    await updateProduct(id, patch);
    handleRefresh();
  }

  return (
    <PageShell
      title="Inventory"
      description="Products, stock, suppliers, and purchases for your shop."
    >
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <InventorySubNav />
        <CrmPageActions moduleId="inventory" />
        <ProductWorkspaceHeader
          lastRefreshedAt={lastRefreshedAt}
          isRefreshing={isLoading}
          onRefresh={handleRefresh}
        />
        <CrmSummaryStrip items={summaryItems} className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-5" />
        {data?.filters ? <ProductFilterChips filters={data.filters} activeFilterId={filter} /> : null}
        <ProductListToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          category={category}
          categoryOptions={categoryOptions}
          onCategoryChange={(value) => setQueryParam('category', value)}
          brandId={brandId}
          brandOptions={brandOptions}
          onBrandChange={(value) => setQueryParam('brandId', value)}
        />
        <ActiveFilterChips
          chips={activeChips}
          onRemove={(id) => {
            if (id === 'search') {
              setSearch('');
              setPage(1);
              return;
            }
            if (id === 'filter' || id === 'category' || id === 'brandId') {
              setQueryParam(id, '');
            }
          }}
          onClearAll={handleClearFilters}
        />
        <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden')}>
          <ProductSelectionBar
            selectedCount={selectedIds.size}
            selectedProductIds={[...selectedIds]}
            selectedRows={selectedRows}
            onClearSelection={() => setSelectedIds(new Set())}
            onSuccess={() => {
              setSelectedIds(new Set());
              handleRefresh();
            }}
          />
          <CardContent className={cn('p-0', ORDER_SECTION_BODY_CLASS)}>
            {error ? (
              <p className="px-4 py-8 text-center text-sm text-destructive">{error}</p>
            ) : !isLoading && data && data.items.length === 0 ? (
              <div className="flex flex-col items-center gap-4 px-4 py-8">
                <EmptyState
                  title="No products in this view"
                  description="Try another filter or add a new product to your catalog."
                  compact
                />
                <Button type="button" variant="outline" size="sm" onClick={handleClearFilters}>
                  Reset filters
                </Button>
              </div>
            ) : (
              <ProductDataTable
                rows={data?.items ?? []}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                isLoading={isLoading}
                page={page}
                pageSize={pageSize}
                total={data?.total}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                showPagination={Boolean(data)}
                rowOffset={(page - 1) * pageSize}
                onStatusChange={(row, status: ProductStatus) => void patchRow(row.id, { status })}
                onStockAdjust={(row, delta) => {
                  if (row.variantCount !== 1 || !row.primaryVariantId) {
                    router.push(`/dashboard/inventory/products/${row.id}`);
                    return;
                  }
                  void adjustStock(row.id, {
                    variantId: row.primaryVariantId,
                    delta,
                    reason: 'Quick adjust from list',
                  }).then(handleRefresh);
                }}
                onDetailsClick={(row: InventoryProductListItem) => {
                  router.push(`/dashboard/inventory/products/${row.id}`);
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

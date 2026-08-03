'use client';

import * as React from 'react';
import Link from 'next/link';
import type { AccountingFilterCount, CreateIncomePayload } from '@laam/types';
import { Download, Plus, RefreshCw, Search } from 'lucide-react';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { FormTextarea } from '@/components/form/form-textarea';
import { ActiveFilterChips } from '@/components/filters/active-filter-chips';
import { Can } from '@/components/auth/can';
import { CrmPageActions } from '@/features/crm/components/crm-page-actions';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { EmptyState } from '@/components/layout/empty-state';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { TransactionDataTable } from '@/features/accounting/components/transaction-list/transaction-data-table';
import { PAYMENT_METHOD_LABELS } from '@/features/accounting/config/accounting-filters';
import { useAccountingMutations } from '@/features/accounting/hooks/use-accounting-mutations';
import { useTransactionList } from '@/features/accounting/hooks/use-transaction-list';
import { useOrgCategoryOptions } from '@/features/settings/hooks/use-org-categories';
import type { TransactionListResponse } from '@laam/types';
import type { TransactionListQuery } from '@laam/types';
import { downloadCsv } from '@/lib/export-csv';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }));
const ACCOUNT_OPTIONS = [
  { value: 'Cash Register', label: 'Cash Register' },
  { value: 'bKash Business', label: 'bKash Business' },
  { value: 'Nagad Merchant', label: 'Nagad Merchant' },
  { value: 'DBBL Current', label: 'DBBL Current' },
];

type TransactionListShellProps = {
  mode: 'income' | 'expense' | 'ledger';
  title: string;
  description: string;
  listFn: (query: TransactionListQuery) => Promise<TransactionListResponse>;
  createLabel?: string;
};

export function TransactionListShell({
  mode,
  title,
  description,
  listFn,
  createLabel,
}: TransactionListShellProps) {
  const { createIncome, createExpense, isLoading: saving } = useAccountingMutations();
  const incomeCategoryOptions = useOrgCategoryOptions('income');
  const expenseCategoryOptions = useOrgCategoryOptions('expense');
  const categoryOptions = mode === 'income' ? incomeCategoryOptions : expenseCategoryOptions;
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [listVersion, setListVersion] = React.useState(0);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({
    date: new Date().toISOString().slice(0, 10),
    category: mode === 'income' ? 'order_sales' : 'courier',
    description: '',
    amount: '',
    paymentMethod: 'bkash',
    accountName: 'bKash Business',
    reference: '',
  });

  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isLoading, error, refresh } = useTransactionList(
    listFn,
    { filter: filter === 'all' ? undefined : filter, search: debouncedSearch || undefined, page, pageSize },
    listVersion,
  );

  const summaryItems = [
    { id: 'count', label: 'Transactions', value: data ? String(data.summary.count) : '—' },
    { id: 'total', label: 'Total amount', value: data ? formatCurrency(data.summary.totalAmount) : '—' },
    { id: 'page', label: 'Page', value: data ? `${page} / ${Math.ceil(data.total / pageSize) || 1}` : '—' },
  ];

  async function handleCreate() {
    const amount = Number(draft.amount);
    if (!draft.description.trim() || !Number.isFinite(amount) || amount <= 0) return;
    const base = {
      date: draft.date,
      description: draft.description.trim(),
      amount,
      paymentMethod: draft.paymentMethod as CreateIncomePayload['paymentMethod'],
      accountName: draft.accountName,
      reference: draft.reference.trim() || undefined,
    };
    if (mode === 'income') {
      await createIncome({ ...base, category: draft.category, relatedOrderId: draft.reference.trim() || undefined });
    } else if (mode === 'expense') {
      await createExpense({ ...base, category: draft.category, relatedSupplier: undefined });
    }
    setCreateOpen(false);
    setDraft((d) => ({ ...d, description: '', amount: '', reference: '' }));
    setListVersion((v) => v + 1);
    void refresh();
  }

  return (
    <PageShell title="Accounting" description={description}>
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <CrmPageActions moduleId="accounting" />
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={() => { setListVersion((v) => v + 1); void refresh(); }}>
              <RefreshCw className={cn('size-3.5', isLoading && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Can permission="accounting.export">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 shrink-0"
                onClick={() => {
                  const rows = data?.items ?? [];
                  downloadCsv(
                    `${mode}-export.csv`,
                    ['Date', 'Description', 'Category', 'Amount', 'Method', 'Account'],
                    rows.map((r) => [
                      r.date,
                      r.description,
                      r.category,
                      r.amount,
                      r.paymentMethod,
                      r.accountName,
                    ]),
                  );
                }}
                disabled={!data?.items.length}
              >
                <Download className="size-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </Can>
            {mode !== 'ledger' && createLabel ? (
              <Button type="button" size="sm" className="h-8 shrink-0" onClick={() => setCreateOpen(true)}>
                <Plus className="size-3.5" />
                <span className="max-w-[9rem] truncate sm:max-w-none">{createLabel}</span>
              </Button>
            ) : null}
          </div>
        </div>

        <CrmSummaryStrip items={summaryItems} className="grid-cols-1 sm:grid-cols-3" />

        {data?.filters ? (
          <FilterChips filters={data.filters} activeFilterId={filter} onChange={(id) => { setFilter(id); setPage(1); }} />
        ) : null}

        <div className="relative w-full max-w-md min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <FormInput value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search description, reference…" className="pl-9" />
        </div>

        <ActiveFilterChips
          chips={[
            ...(filter && filter !== 'all'
              ? [
                  {
                    id: 'filter',
                    label:
                      data?.filters?.find((f) => f.id === filter)?.label ?? filter,
                  },
                ]
              : []),
            ...(search.trim()
              ? [{ id: 'search', label: `Search: ${search.trim()}` }]
              : []),
          ]}
          onRemove={(id) => {
            if (id === 'search') {
              setSearch('');
              setPage(1);
              return;
            }
            if (id === 'filter') {
              setFilter('all');
              setPage(1);
            }
          }}
          onClearAll={() => {
            setSearch('');
            setFilter('all');
            setPage(1);
          }}
        />

        <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden')}>
          <CardContent className={cn('p-0', ORDER_SECTION_BODY_CLASS)}>
            {error ? (
              <p className="px-4 py-8 text-center text-sm text-destructive">{error}</p>
            ) : !isLoading && data && data.items.length === 0 ? (
              <div className="flex flex-col items-center gap-4 px-4 py-8">
                <EmptyState
                  title="No transactions"
                  description="Record income or expenses to see them here."
                  compact
                />
              </div>
            ) : (
              <TransactionDataTable
                rows={data?.items ?? []}
                isLoading={isLoading}
                page={page}
                pageSize={pageSize}
                total={data?.total}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                showPagination={Boolean(data)}
                rowOffset={(page - 1) * pageSize}
                showType={mode === 'ledger'}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{createLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label="Date">
              <input type="date" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
            </FormField>
            <FormField label="Category">
              <FormSearchSelect value={draft.category} onChange={(v) => setDraft((d) => ({ ...d, category: v }))} options={categoryOptions} searchable={false} />
              <p className="mt-1.5 text-xs text-muted-foreground">
                <Link href="/dashboard/settings/categories" className="font-medium text-primary hover:underline">
                  Manage categories
                </Link>
              </p>
            </FormField>
            <FormField label="Description" required>
              <FormTextarea rows={2} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="What was this for?" />
            </FormField>
            <FormField label="Amount (৳)" required>
              <FormInput type="number" value={draft.amount} onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Payment method">
                <FormSearchSelect value={draft.paymentMethod} onChange={(v) => setDraft((d) => ({ ...d, paymentMethod: v }))} options={PAYMENT_OPTIONS} searchable={false} />
              </FormField>
              <FormField label="Account">
                <FormSearchSelect value={draft.accountName} onChange={(v) => setDraft((d) => ({ ...d, accountName: v }))} options={ACCOUNT_OPTIONS} />
              </FormField>
            </div>
            <FormField label="Reference (order #, PO, etc.)">
              <FormInput value={draft.reference} onChange={(e) => setDraft((d) => ({ ...d, reference: e.target.value }))} placeholder="ORD-12345" />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="button" disabled={saving} onClick={() => void handleCreate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function FilterChips({
  filters,
  activeFilterId,
  onChange,
}: {
  filters: AccountingFilterCount[];
  activeFilterId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="custom-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 sm:flex-wrap sm:overflow-visible">
      {filters.map((filter) => {
        const isActive = filter.id === activeFilterId;
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onChange(filter.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40',
            )}
          >
            {filter.label}
            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums', isActive ? 'bg-primary-foreground/20' : 'bg-muted')}>
              {filter.count}
            </span>
          </button>
        );
      })}
    </div>
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

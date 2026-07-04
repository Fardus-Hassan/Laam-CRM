'use client';

import type { LedgerEntry } from '@laam/types';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

import type { CrmColumnDef } from '@/components/data-table';
import { DataTableEmptyValue } from '@/components/data-table/cells';
import { Badge } from '@/components/ui/badge';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHOD_LABELS,
} from '@/features/accounting/config/accounting-filters';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const JOURNAL_CATEGORY_LABELS: Record<string, string> = {
  inventory_purchase: 'Inventory purchase',
  inventory_production: 'Production (raw → finished)',
  inventory_transfer: 'Inventory transfer',
  inventory_cogs: 'Inventory out (COGS)',
};

function categoryLabel(category: string, type: string) {
  if (type === 'income') {
    return INCOME_CATEGORIES.find((c) => c.id === category)?.label ?? category;
  }
  if (type === 'expense') {
    return EXPENSE_CATEGORIES.find((c) => c.id === category)?.label ?? category;
  }
  return JOURNAL_CATEGORY_LABELS[category] ?? category.replace(/_/g, ' ');
}

export function buildTransactionTableColumns(options?: {
  rowOffset?: number;
  showType?: boolean;
}): CrmColumnDef<LedgerEntry>[] {
  const rowOffset = options?.rowOffset ?? 0;

  return [
    {
      id: 'sl',
      header: 'SL',
      size: 44,
      meta: { label: 'SL', priority: 'primary', align: 'middle' },
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">{rowOffset + row.index + 1}</span>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      size: 100,
      meta: { label: 'Date', priority: 'primary', align: 'middle' },
      cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.date}</span>,
    },
    ...(options?.showType
      ? [
          {
            id: 'type',
            header: 'Type',
            size: 90,
            meta: { label: 'Type', priority: 'primary', align: 'middle' },
            cell: ({ row }: { row: { original: LedgerEntry } }) => (
              <Badge
                variant={
                  row.original.type === 'income'
                    ? 'default'
                    : row.original.type === 'journal'
                      ? 'outline'
                      : 'secondary'
                }
                className="gap-1 text-[10px]"
              >
                {row.original.type === 'income' ? (
                  <ArrowDownLeft className="size-3" />
                ) : row.original.type === 'journal' ? null : (
                  <ArrowUpRight className="size-3" />
                )}
                {row.original.type === 'journal' ? 'journal' : row.original.type}
              </Badge>
            ),
          } as CrmColumnDef<LedgerEntry>,
        ]
      : []),
    {
      id: 'description',
      header: 'Description',
      size: 220,
      meta: { label: 'Description', priority: 'primary', align: 'top' },
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="font-medium">{row.original.description}</p>
          <p className="text-[10px] text-muted-foreground">
            {categoryLabel(row.original.category, row.original.type)}
          </p>
        </div>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      size: 120,
      meta: { label: 'Amount', priority: 'primary', align: 'middle' },
      cell: ({ row }) => (
        <span
          className={cn(
            'font-semibold tabular-nums',
            row.original.type === 'income'
              ? 'text-emerald-600'
              : row.original.type === 'journal'
                ? 'text-foreground'
                : 'text-red-600',
          )}
        >
          {row.original.type === 'income' ? '+' : row.original.type === 'journal' ? '' : '−'}
          {formatCurrency(row.original.amount)}
        </span>
      ),
    },
    {
      id: 'method',
      header: 'Method',
      size: 100,
      meta: { label: 'Payment', priority: 'secondary', align: 'middle' },
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px]">
          {PAYMENT_METHOD_LABELS[row.original.paymentMethod]}
        </Badge>
      ),
    },
    {
      id: 'account',
      header: 'Account',
      size: 130,
      meta: { label: 'Account', priority: 'secondary', align: 'middle' },
      cell: ({ row }) => <span className="text-xs">{row.original.accountName}</span>,
    },
    {
      id: 'reference',
      header: 'Reference',
      size: 110,
      meta: { label: 'Reference', priority: 'secondary', align: 'middle' },
      cell: ({ row }) =>
        row.original.reference ? (
          <span className="font-mono text-xs">{row.original.reference}</span>
        ) : (
          <DataTableEmptyValue />
        ),
    },
    {
      id: 'by',
      header: 'Recorded by',
      size: 110,
      meta: { label: 'By', priority: 'hidden-mobile', align: 'middle' },
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.createdByName ?? '—'}</span>
      ),
    },
  ];
}

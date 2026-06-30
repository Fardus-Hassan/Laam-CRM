'use client';

import type { ReactNode } from 'react';
import type { Row, Table } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';

import { LabeledSection } from '@/components/data-table/cells';
import type { CrmColumnMeta, CrmRowContext } from '@/components/data-table/crm-data-table-types';
import { Checkbox, type CheckedState } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type CrmDataTableMobileProps<T> = {
  table: Table<T>;
  mobileCard?: (row: T, ctx: CrmRowContext<T>) => ReactNode;
  enableRowSelection?: boolean;
  className?: string;
};

export function CrmDataTableMobile<T>({
  table,
  mobileCard,
  enableRowSelection,
  className,
}: CrmDataTableMobileProps<T>) {
  return (
    <div className={cn('space-y-3 p-3', className)}>
      {table.getRowModel().rows.map((row) => (
        <MobileRowCard
          key={row.id}
          row={row}
          table={table}
          mobileCard={mobileCard}
          enableRowSelection={enableRowSelection}
        />
      ))}
    </div>
  );
}

function MobileRowCard<T>({
  row,
  table,
  mobileCard,
  enableRowSelection,
}: {
  row: Row<T>;
  table: Table<T>;
  mobileCard?: (row: T, ctx: CrmRowContext<T>) => ReactNode;
  enableRowSelection?: boolean;
}) {
  const ctx: CrmRowContext<T> = {
    row,
    table,
    isSelected: row.getIsSelected(),
    toggleSelected: (value) => row.toggleSelected(value),
  };

  return (
    <article
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-colors',
        row.getIsSelected() && 'border-primary/40 ring-1 ring-primary/20',
      )}
    >
      {mobileCard ? (
        mobileCard(row.original, ctx)
      ) : (
        <DefaultMobileCard row={row} enableRowSelection={enableRowSelection} />
      )}
    </article>
  );
}

function DefaultMobileCard<T>({
  row,
  enableRowSelection,
}: {
  row: Row<T>;
  enableRowSelection?: boolean;
}) {
  const cells = row.getVisibleCells();

  return (
    <div className="p-4">
      {enableRowSelection ? (
        <div className="mb-3 flex items-center gap-2 border-b border-border/60 pb-3">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value: CheckedState) => row.toggleSelected(value === true)}
            aria-label={`Select row ${row.id}`}
          />
          <span className="text-xs text-muted-foreground">Select</span>
        </div>
      ) : null}
      <div className="space-y-4">
        {cells.map((cell) => {
          const meta = (cell.column.columnDef.meta as CrmColumnMeta | undefined) ?? {};
          const label =
            meta.label ??
            (typeof cell.column.columnDef.header === 'string'
              ? cell.column.columnDef.header
              : cell.column.id);
          return (
            <LabeledSection key={cell.id} title={label}>
              <div className="text-sm">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            </LabeledSection>
          );
        })}
      </div>
    </div>
  );
}

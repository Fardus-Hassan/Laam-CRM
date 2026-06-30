'use client';

import type { CSSProperties } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { flexRender, type Column, type Header } from '@tanstack/react-table';

import type { CrmColumnMeta } from '@/components/data-table/crm-data-table-types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function CrmDataTableColumnHeader<T>({
  header,
  className,
}: {
  header: Header<T, unknown>;
  className?: string;
}) {
  const canSort = header.column.getCanSort();
  const sorted = header.column.getIsSorted();

  if (!canSort) {
    return (
      <span className={className}>
        {flexRender(header.column.columnDef.header, header.getContext())}
      </span>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('-ml-2 h-8 px-2 text-[11px] font-semibold uppercase', className)}
      onClick={header.column.getToggleSortingHandler()}
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
      {sorted === 'asc' ? (
        <ArrowUp className="size-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="size-3.5" />
      ) : (
        <ArrowUpDown className="size-3.5 opacity-50" />
      )}
    </Button>
  );
}

export function getColumnMeta<T>(header: Header<T, unknown>): CrmColumnMeta {
  return (header.column.columnDef.meta as CrmColumnMeta | undefined) ?? {};
}

/** Pinning styles with explicit width — prevents sticky column overlap. */
export function getPinningStyles<T>(column: Column<T, unknown>): CSSProperties {
  const pinned = column.getIsPinned();
  if (!pinned) {
    return {};
  }

  const isLeft = pinned === 'left';
  const size = column.getSize();

  return {
    position: 'sticky',
    left: isLeft ? `${column.getStart('left')}px` : undefined,
    right: !isLeft ? `${column.getAfter('right')}px` : undefined,
    width: size,
    minWidth: size,
    maxWidth: size,
    zIndex: isLeft ? 3 : 2,
  };
}

export function getPinningClassName<T>(column: Column<T, unknown>): string {
  return column.getIsPinned() ? 'bg-card' : '';
}

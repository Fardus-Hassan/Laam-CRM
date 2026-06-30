'use client';

import { Columns3, Search } from 'lucide-react';
import type { Table } from '@tanstack/react-table';

import { FormInput } from '@/components/form/form-input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type CrmDataTableToolbarProps<T> = {
  table: Table<T>;
  className?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** When true, omits outer border/padding for embedding in a card header row. */
  embedded?: boolean;
};

export function CrmDataTableToolbar<T>({
  table,
  className,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  embedded = false,
}: CrmDataTableToolbarProps<T>) {
  const hideableColumns = table
    .getAllColumns()
    .filter((column) => column.getCanHide() && column.id !== '__select');

  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2',
        embedded ? 'min-w-0 flex-1' : 'shrink-0 border-b border-border/60 px-3 py-2',
        className,
      )}
    >
      {onSearchChange ? (
        <div className="relative min-w-0 flex-1 sm:flex-none sm:w-[200px] md:w-[240px]">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <FormInput
            value={search ?? ''}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-8 text-sm"
            data-no-drag-scroll
          />
        </div>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" variant="outline">
            <Columns3 className="size-4" />
            Columns
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {hideableColumns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
            >
              {typeof column.columnDef.header === 'string'
                ? column.columnDef.header
                : column.id}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function CrmDataTableMobileSearch({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  className,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  className?: string;
}) {
  if (!onSearchChange) {
    return null;
  }

  return (
    <div className={cn('border-b border-border/60 px-3 py-2', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <FormInput
          value={search ?? ''}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 pl-8 text-sm"
        />
      </div>
    </div>
  );
}

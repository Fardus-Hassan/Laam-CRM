'use client';

import { flexRender, type Cell, type Row, type Table as TanStackTable } from '@tanstack/react-table';
import { ChevronDown, ChevronRight } from 'lucide-react';

import {
  CrmDataTableColumnHeader,
  getColumnMeta,
  getPinningClassName,
  getPinningStyles,
} from '@/components/data-table/crm-data-table-column-header';
import type { CrmColumnMeta, CrmDataTableDensity } from '@/components/data-table/crm-data-table-types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDragToScroll } from '@/hooks/use-drag-to-scroll';

const TABLE_CELL_BORDER = 'border-r border-b border-border';
const TABLE_OUTER_BORDER = 'border-l border-t border-border';

type CrmDataTableDesktopProps<T> = {
  table: TanStackTable<T>;
  density: CrmDataTableDensity;
  minTableWidth?: number | string;
  isTablet?: boolean;
  expandedRows?: Record<string, boolean>;
  onToggleExpanded?: (rowId: string) => void;
  hiddenOnTablet?: string[];
  className?: string;
};

export function CrmDataTableDesktop<T>({
  table,
  density,
  minTableWidth,
  isTablet,
  expandedRows,
  onToggleExpanded,
  hiddenOnTablet = [],
  className,
}: CrmDataTableDesktopProps<T>) {
  const cellPadding = density === 'compact' ? 'py-2' : 'py-3';
  const showExpand = Boolean(isTablet && hiddenOnTablet.length > 0);
  const scrollRef = useDragToScroll<HTMLDivElement>();

  return (
    <div
      ref={scrollRef}
      className={cn(
        'custom-scrollbar relative max-h-[min(70vh,780px)] w-full overflow-auto',
        '[&[data-drag-scrolling=true]]:cursor-grabbing',
      )}
    >
      <table
        className={cn(
          'w-full caption-bottom border-separate border-spacing-0 text-sm',
          'table-fixed',
          TABLE_OUTER_BORDER,
          className,
        )}
        style={minTableWidth ? { minWidth: minTableWidth, width: '100%' } : { width: '100%' }}
      >
        <thead className="sticky top-0 z-30 bg-card">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const meta = getColumnMeta(header);
                const pinned = header.column.getIsPinned();
                return (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      'h-10 bg-card px-3 py-2.5 text-left align-middle text-[11px] font-semibold tracking-wide text-muted-foreground uppercase',
                      TABLE_CELL_BORDER,
                      meta.headerClassName,
                      getPinningClassName(header.column),
                      pinned && 'z-40',
                    )}
                    style={{
                      width: header.column.getSize(),
                      ...getPinningStyles(header.column),
                    }}
                  >
                    {header.isPlaceholder || header.column.id === '__expand' ? null : (
                      <CrmDataTableColumnHeader header={header} />
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <DesktopRow
              key={row.id}
              row={row}
              table={table}
              cellPadding={cellPadding}
              showExpand={showExpand}
              hiddenOnTablet={hiddenOnTablet}
              expanded={expandedRows?.[row.id] ?? false}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DesktopRow<T>({
  row,
  table,
  cellPadding,
  showExpand,
  hiddenOnTablet,
  expanded,
  onToggleExpanded,
}: {
  row: Row<T>;
  table: TanStackTable<T>;
  cellPadding: string;
  showExpand: boolean;
  hiddenOnTablet: string[];
  expanded: boolean;
  onToggleExpanded?: (rowId: string) => void;
}) {
  const isSelected = row.getIsSelected();
  const colSpan = table.getVisibleLeafColumns().length;

  return (
    <>
      <tr
        data-state={isSelected ? 'selected' : undefined}
        className={cn(
          'transition-colors',
          'hover:bg-muted/30 data-[state=selected]:bg-primary/5 data-[state=selected]:hover:bg-primary/8',
          'group border-l-2 border-l-transparent hover:border-l-primary',
          isSelected && 'border-l-primary',
        )}
      >
        {row.getVisibleCells().map((cell) => (
          <DataCell
            key={cell.id}
            cell={cell}
            cellPadding={cellPadding}
            showExpand={showExpand}
            expanded={expanded}
            onToggleExpanded={() => onToggleExpanded?.(row.id)}
          />
        ))}
      </tr>
      {showExpand && expanded ? (
        <tr className="bg-muted/20">
          <td colSpan={colSpan} className={cn(TABLE_CELL_BORDER, 'px-4 py-3')}>
            <ExpandedRowDetails row={row} hiddenColumnIds={hiddenOnTablet} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function DataCell<T>({
  cell,
  cellPadding,
  showExpand,
  expanded,
  onToggleExpanded,
}: {
  cell: Cell<T, unknown>;
  cellPadding: string;
  showExpand: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const meta = (cell.column.columnDef.meta as CrmColumnMeta | undefined) ?? {};
  const pinned = cell.column.getIsPinned();

  if (cell.column.id === '__expand') {
    return (
      <td
        className={cn(cellPadding, 'w-10 bg-card', TABLE_CELL_BORDER)}
        style={{ width: cell.column.getSize(), ...getPinningStyles(cell.column) }}
      >
        {showExpand ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            data-no-drag-scroll
            onClick={onToggleExpanded}
            aria-label={expanded ? 'Collapse row' : 'Expand row'}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        ) : null}
      </td>
    );
  }

  return (
    <td
      className={cn(
        cellPadding,
        'overflow-hidden bg-card px-3 text-sm',
        TABLE_CELL_BORDER,
        meta.cellClassName,
        meta.align === 'top' && 'align-top whitespace-normal',
        meta.align === 'middle' && 'align-middle whitespace-nowrap',
        meta.align === 'center' && 'align-middle text-center whitespace-normal',
        getPinningClassName(cell.column),
        pinned && 'z-20',
      )}
      style={{
        width: cell.column.getSize(),
        ...getPinningStyles(cell.column),
      }}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </td>
  );
}

function ExpandedRowDetails<T>({
  row,
  hiddenColumnIds,
}: {
  row: Row<T>;
  hiddenColumnIds: string[];
}) {
  const cells = row.getAllCells().filter((cell) => hiddenColumnIds.includes(cell.column.id));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cells.map((cell) => {
        const meta = (cell.column.columnDef.meta as CrmColumnMeta | undefined) ?? {};
        const label =
          meta.label ??
          (typeof cell.column.columnDef.header === 'string'
            ? cell.column.columnDef.header
            : cell.column.id);
        return (
          <div key={cell.id} className="space-y-1 rounded-md border border-border/60 bg-card p-2">
            <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              {label}
            </p>
            <div className="text-sm">
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          </div>
        );
      })}
    </div>
  );
}

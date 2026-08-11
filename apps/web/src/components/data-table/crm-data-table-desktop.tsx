'use client';

import * as React from 'react';
import type { CSSProperties } from 'react';
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

/** Hide scrollbar on sticky header strip — body shows the real horizontal bar. */
const HIDE_SCROLLBAR =
  '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

function getColumnSizeStyle(column: {
  getSize: () => number;
  columnDef: { minSize?: number; maxSize?: number };
}): CSSProperties {
  const size = column.getSize();
  const minSize = column.columnDef.minSize ?? size;
  const maxSize = column.columnDef.maxSize;
  const isFixed = maxSize != null && maxSize <= size;
  return {
    width: size,
    minWidth: minSize,
    ...(isFixed ? { maxWidth: maxSize } : null),
  };
}

type CrmDataTableDesktopProps<T> = {
  table: TanStackTable<T>;
  density: CrmDataTableDensity;
  minTableWidth?: number | string;
  isTablet?: boolean;
  expandedRows?: Record<string, boolean>;
  onToggleExpanded?: (rowId: string) => void;
  hiddenOnTablet?: string[];
  className?: string;
  /**
   * Renders inside the sticky top shell above the column headers
   * (e.g. “Showing…” + Rows control).
   */
  stickyTopSlot?: React.ReactNode;
};

/**
 * Full-height table (no max-height). Vertical scroll = dashboard page.
 * Sticky header shell (meta + column headers). Horizontal strips stay in sync;
 * drag thead left/right like before.
 */
export function CrmDataTableDesktop<T>({
  table,
  density,
  minTableWidth,
  isTablet,
  expandedRows,
  onToggleExpanded,
  hiddenOnTablet = [],
  className,
  stickyTopSlot,
}: CrmDataTableDesktopProps<T>) {
  const cellPadding = density === 'compact' ? 'py-2' : 'py-3';
  const showExpand = Boolean(isTablet && hiddenOnTablet.length > 0);
  const headerScrollRef = useDragToScroll<HTMLDivElement>({ handleSelector: 'thead' });
  const bodyScrollRef = React.useRef<HTMLDivElement>(null);
  const syncing = React.useRef(false);

  function syncScroll(source: 'header' | 'body') {
    if (syncing.current) return;
    const header = headerScrollRef.current;
    const body = bodyScrollRef.current;
    if (!header || !body) return;
    syncing.current = true;
    if (source === 'header') body.scrollLeft = header.scrollLeft;
    else header.scrollLeft = body.scrollLeft;
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  }

  const totalColumnWidth = table.getTotalSize();
  const minWidthPx =
    typeof minTableWidth === 'number'
      ? Math.max(minTableWidth, totalColumnWidth)
      : typeof minTableWidth === 'string'
        ? minTableWidth
        : totalColumnWidth;

  const leafColumns = table.getVisibleLeafColumns();
  const tableStyle: CSSProperties = {
    width: '100%',
    minWidth: minWidthPx,
  };

  const colgroup = (
    <colgroup>
      {leafColumns.map((column) => (
        <col key={column.id} style={getColumnSizeStyle(column)} />
      ))}
    </colgroup>
  );

  const sharedTableClass = cn(
    'w-full caption-bottom border-separate border-spacing-0 text-sm table-fixed',
    TABLE_OUTER_BORDER,
    className,
  );

  return (
    <div className="min-w-0">
      {/*
        Sticky to dashboard page scroll (under app header h-14 / sm:h-16).
        Meta + column headers pin together. No fixed table height.
      */}
      <div
        className={cn(
          'sticky z-30 border-b border-border/70 bg-card shadow-sm',
          'top-14 sm:top-16',
        )}
      >
        {stickyTopSlot}

        <div
          ref={headerScrollRef}
          onScroll={() => syncScroll('header')}
          className={cn(
            'custom-scrollbar overflow-x-auto overflow-y-hidden overscroll-x-contain',
            HIDE_SCROLLBAR,
            'cursor-grab [&[data-drag-scrolling=true]]:cursor-grabbing',
          )}
        >
          <table className={sharedTableClass} style={tableStyle}>
            {colgroup}
            <thead className="select-none [&_*]:select-none">
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
                          ...getColumnSizeStyle(header.column),
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
          </table>
        </div>
      </div>

      {/* Natural height body — page scrolls vertically. Only horizontal overflow. */}
      <div
        ref={bodyScrollRef}
        onScroll={() => syncScroll('body')}
        className="custom-scrollbar min-w-0 overflow-x-auto overscroll-x-contain"
      >
        <table className={sharedTableClass} style={tableStyle}>
          {colgroup}
          <tbody className="select-text">
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
        style={{ ...getColumnSizeStyle(cell.column), ...getPinningStyles(cell.column) }}
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
        ...getColumnSizeStyle(cell.column),
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

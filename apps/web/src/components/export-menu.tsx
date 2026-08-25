'use client';

import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  downloadTable,
  type TableCell,
  type TableExportFormat,
} from '@/lib/export-csv';
import { cn } from '@/lib/utils';

type ExportMenuProps = {
  filename: string;
  headers: string[];
  rows: TableCell[][];
  disabled?: boolean;
  label?: string;
  className?: string;
  size?: 'default' | 'sm' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  onExport?: (format: TableExportFormat) => void;
};

export function ExportMenu({
  filename,
  headers,
  rows,
  disabled,
  label = 'Export',
  className,
  size = 'sm',
  variant = 'outline',
  onExport,
}: ExportMenuProps) {
  const blocked = disabled || (!onExport && rows.length === 0);

  function handle(format: TableExportFormat) {
    if (onExport) {
      onExport(format);
      return;
    }
    downloadTable(filename, headers, rows, format);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size={size}
          variant={variant}
          disabled={blocked}
          className={cn(className)}
        >
          <Download className="size-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={blocked} onClick={() => handle('csv')}>
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem disabled={blocked} onClick={() => handle('excel')}>
          Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

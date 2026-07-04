'use client';

import * as React from 'react';
import type { ImportEntityType, ImportJobResult } from '@laam/types';
import { Download, FileUp, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { dataImportApi } from '@/features/data-import/api/data-import-api';
import { getImportStats } from '@/features/data-import/data/import-store';
import { downloadTemplateCsv } from '@/features/data-import/lib/parse-csv';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

const ENTITY_OPTIONS: {
  id: ImportEntityType;
  label: string;
  description: string;
  headers: string[];
  sample: string[][];
}[] = [
  {
    id: 'customers',
    label: 'Customers',
    description: 'Name, phone, address — migrate buyers from your old CRM.',
    headers: ['name', 'phone', 'email', 'address', 'district', 'tags', 'notes'],
    sample: [
      ['Fatima Begum', '01712345678', 'fatima@email.com', 'Mirpur 10', 'Dhaka', 'vip;repeat', 'Prefers evening call'],
      ['Karim Uddin', '01898765432', '', 'Agrabad', 'Chittagong', 'new', ''],
    ],
  },
  {
    id: 'orders',
    label: 'Orders',
    description: 'Order lines with customer + product — one row per line item.',
    headers: [
      'order_number',
      'customer_name',
      'customer_phone',
      'address',
      'district',
      'product_name',
      'quantity',
      'unit_price',
      'delivery_charge',
      'discount',
      'status',
      'payment_status',
      'source',
      'notes',
      'created_at',
    ],
    sample: [
      [
        'MH-1001',
        'Fatima Begum',
        '01712345678',
        'Mirpur 10',
        'Dhaka',
        'Modhu 500g',
        '2',
        '850',
        '60',
        '0',
        'delivered',
        'paid',
        'facebook',
        '',
        '2026-06-01',
      ],
      [
        'MH-1002',
        'Karim Uddin',
        '01898765432',
        'Agrabad',
        'Chittagong',
        'Khejur 1kg',
        '1',
        '1200',
        '80',
        '50',
        'pending',
        'cod',
        'call',
        '',
        '2026-06-02',
      ],
    ],
  },
];

export function DataImportPage() {
  const [entityType, setEntityType] = React.useState<ImportEntityType>('customers');
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [fileText, setFileText] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState({ processed: 0, total: 0, success: 0, errors: 0 });
  const [result, setResult] = React.useState<ImportJobResult | null>(null);
  const [stats, setStats] = React.useState(getImportStats());
  const inputRef = React.useRef<HTMLInputElement>(null);

  const entity = ENTITY_OPTIONS.find((e) => e.id === entityType)!;
  const percent = progress.total ? Math.round((progress.processed / progress.total) * 100) : 0;

  function handleDownloadTemplate() {
    downloadTemplateCsv(`${entityType}-template.csv`, entity.headers, entity.sample);
  }

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a .csv file');
      return;
    }
    // Allow large files (10k–20k rows ≈ few MB)
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File is too large (max 25 MB)');
      return;
    }
    const text = await file.text();
    setFileName(file.name);
    setFileText(text);
    setResult(null);
    setProgress({ processed: 0, total: 0, success: 0, errors: 0 });
  }

  async function handleImport() {
    if (!fileText) {
      toast.error('Choose a CSV file first');
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const job = await dataImportApi.importCsv(entityType, fileText, (processed, total, success, errors) => {
        setProgress({ processed, total, success, errors });
      });
      setResult(job);
      setStats(getImportStats());
      if (job.successCount > 0) {
        toast.success(`Imported ${job.successCount.toLocaleString()} ${entityType}`);
      } else {
        toast.error('Import finished with errors');
      }
    } catch {
      toast.error('Import failed');
    } finally {
      setRunning(false);
    }
  }

  return (
    <PageShell
      title="Bulk data import"
      description="Migrate customers and orders from your existing CRM — supports 10,000–20,000 rows per file."
    >
      <div className={ORDER_PAGE_GAP}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className={ORDER_CARD_CLASS}>
            <CardContent className={ORDER_SECTION_BODY_CLASS}>
              <p className="text-xs text-muted-foreground">Customers imported (session)</p>
              <p className="text-2xl font-bold tabular-nums">{stats.customers.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className={ORDER_CARD_CLASS}>
            <CardContent className={ORDER_SECTION_BODY_CLASS}>
              <p className="text-xs text-muted-foreground">Orders imported (session)</p>
              <p className="text-2xl font-bold tabular-nums">{stats.orders.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          {ENTITY_OPTIONS.map((opt) => (
            <Button
              key={opt.id}
              type="button"
              size="sm"
              variant={entityType === opt.id ? 'default' : 'outline'}
              onClick={() => {
                setEntityType(opt.id);
                setFileName(null);
                setFileText(null);
                setResult(null);
              }}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Import {entity.label}</CardTitle>
          </CardHeader>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4')}>
            <p className="text-sm text-muted-foreground">{entity.description}</p>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={handleDownloadTemplate}>
                <Download className="size-4" />
                Download CSV template
              </Button>
            </div>

            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center transition-colors hover:border-primary/40 hover:bg-muted/30"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) void handleFile(file);
              }}
            >
              <FileUp className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                {fileName ? fileName : 'Drop CSV here or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground">
                UTF-8 CSV · up to ~20,000 rows · max 25 MB
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </div>

            {running || progress.total > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {progress.processed.toLocaleString()} / {progress.total.toLocaleString()} rows
                  </span>
                  <span>{percent}%</span>
                </div>
                <Progress value={percent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Success: {progress.success.toLocaleString()} · Errors: {progress.errors.toLocaleString()}
                </p>
              </div>
            ) : null}

            <Button
              type="button"
              onClick={() => void handleImport()}
              disabled={!fileText || running}
            >
              <Upload className="size-4" />
              {running ? 'Importing…' : `Start ${entity.label.toLowerCase()} import`}
            </Button>
          </CardContent>
        </Card>

        {result ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">Import result</CardTitle>
                <Badge variant={result.status === 'completed' ? 'success' : 'destructive'}>
                  {result.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
              <div className="grid gap-2 sm:grid-cols-3 text-sm">
                <p>Total: <strong>{result.totalRows.toLocaleString()}</strong></p>
                <p className="text-emerald-600">Success: <strong>{result.successCount.toLocaleString()}</strong></p>
                <p className="text-destructive">Errors: <strong>{result.errorCount.toLocaleString()}</strong></p>
              </div>
              {result.errors.length ? (
                <div className="max-h-48 overflow-y-auto rounded-md border text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left">
                        <th className="px-2 py-1">Row</th>
                        <th className="px-2 py-1">Field</th>
                        <th className="px-2 py-1">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="px-2 py-1 tabular-nums">{err.row}</td>
                          <td className="px-2 py-1">{err.field ?? '—'}</td>
                          <td className="px-2 py-1">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Migration tips</CardTitle>
          </CardHeader>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-2 text-sm text-muted-foreground')}>
            <p>1. Export customers/orders from your old CRM as CSV (Excel → Save as CSV UTF-8).</p>
            <p>2. Download our template and map columns (phone must be present).</p>
            <p>3. Import customers first, then orders — large files process in 500-row chunks so the UI stays responsive.</p>
            <p>4. When API is connected (`NEXT_PUBLIC_USE_API=true`), the same screen posts to `/crm/import/customers` and `/crm/import/orders`.</p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

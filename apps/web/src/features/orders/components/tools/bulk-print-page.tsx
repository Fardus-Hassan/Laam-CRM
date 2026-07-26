'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import type { CrmColumnDef } from '@/components/data-table';
import type { OrderDetail } from '@laam/types';

import { CrmDataTable } from '@/components/data-table';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stepper } from '@/components/ui/stepper';
import { useBrand } from '@/features/brand/providers/brand-provider';
import { ordersApi } from '@/features/orders/api/orders-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import {
  absoluteUrl,
  buildBulkPrintDocumentHtml,
  printHtmlDocument,
  type OrderPrintType,
} from '@/features/orders/components/shared/order-print';
import { cn } from '@/lib/utils';

type PreviewRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  amount: number;
};

const PREVIEW_COLUMNS: CrmColumnDef<PreviewRow>[] = [
  { id: 'order', header: 'Order', cell: ({ row }) => row.original.orderNumber },
  { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customerName },
  { id: 'phone', header: 'Phone', cell: ({ row }) => row.original.customerPhone },
  {
    id: 'amount',
    header: 'Amount',
    cell: ({ row }) => row.original.amount.toLocaleString('en-BD'),
  },
];

const BULK_PRINT_STEPS = [
  { id: 'select', label: 'Select orders' },
  { id: 'template', label: 'Template' },
  { id: 'print', label: 'Print' },
];

export function BulkPrintPage() {
  const searchParams = useSearchParams();
  const brand = useBrand();
  const [step, setStep] = React.useState(1);
  const [orderIdsInput, setOrderIdsInput] = React.useState(searchParams.get('ids') ?? '');
  const [template, setTemplate] = React.useState<OrderPrintType>('invoice');
  const [orders, setOrders] = React.useState<OrderDetail[]>([]);
  const [missing, setMissing] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [printing, setPrinting] = React.useState(false);

  const previewRows: PreviewRow[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    amount: order.amount,
  }));

  async function loadPreview() {
    const ids = [
      ...new Set(
        orderIdsInput
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ];
    if (ids.length === 0) {
      toast.error('Enter at least one order ID or number');
      return;
    }
    setLoading(true);
    try {
      const found: OrderDetail[] = [];
      const notFound: string[] = [];
      for (const id of ids) {
        const order = await ordersApi.getOrder(id);
        if (order) found.push(order);
        else notFound.push(id);
      }
      setOrders(found);
      setMissing(notFound);
      if (found.length === 0) {
        toast.error('No matching orders found');
        return;
      }
      if (notFound.length > 0) {
        toast.warning(`${notFound.length} ID(s) not found — continuing with ${found.length}`);
      }
      setStep(2);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load orders');
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    if (orders.length === 0) {
      toast.error('No orders to print');
      return;
    }
    setPrinting(true);
    try {
      const logoUrl =
        brand.logos.light?.trim() ||
        brand.logos.dark?.trim() ||
        brand.logos.favicon?.trim() ||
        '';
      const html = buildBulkPrintDocumentHtml({
        orders,
        type: template,
        brandName: brand.name?.trim() || 'Store',
        logoUrl: absoluteUrl(logoUrl),
        primaryColor: brand.colors.primary || '#127A3B',
      });
      printHtmlDocument(html);
      setStep(3);
      toast.success(`Print dialog opened for ${orders.length} document(s)`);
    } catch {
      toast.error('Could not open print dialog. Try again.');
    } finally {
      setPrinting(false);
    }
  }

  return (
    <PageShell
      title="Bulk Print"
      description="Print invoices, packing slips, or shipping labels for multiple orders."
    >
      <div className={ORDER_PAGE_GAP}>
        <Stepper steps={BULK_PRINT_STEPS} currentStep={step} />

        {step === 1 ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Order IDs</CardTitle>
            </CardHeader>
            <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
              <FormField label="Paste order numbers or IDs (comma or newline separated)">
                <FormInput
                  value={orderIdsInput}
                  onChange={(e) => setOrderIdsInput(e.target.value)}
                  placeholder="ORD-1001, ORD-1002"
                />
              </FormField>
              <Button type="button" onClick={() => void loadPreview()} disabled={loading}>
                {loading ? 'Loading…' : 'Next — choose template'}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {step >= 2 ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">
                Template & preview ({orders.length} orders)
              </CardTitle>
            </CardHeader>
            <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
              <FormField label="Print template">
                <FormSelect
                  value={template}
                  onChange={(value) => setTemplate(value as OrderPrintType)}
                  options={[
                    { value: 'invoice', label: 'Invoice' },
                    { value: 'packing', label: 'Packing slip' },
                    { value: 'label', label: 'Shipping label' },
                  ]}
                  searchable={false}
                />
              </FormField>
              {missing.length > 0 ? (
                <p className="text-xs text-amber-700">
                  Not found: {missing.slice(0, 8).join(', ')}
                  {missing.length > 8 ? ` (+${missing.length - 8} more)` : ''}
                </p>
              ) : null}
              <CrmDataTable
                columns={PREVIEW_COLUMNS}
                data={previewRows}
                getRowId={(row) => row.id}
                showPagination={false}
                showToolbar={false}
                manualPagination={false}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" onClick={handlePrint} disabled={printing || orders.length === 0}>
                  {printing ? 'Opening…' : 'Print / Save PDF'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === 3 ? (
          <p className="text-sm text-muted-foreground">
            System print dialog opened for {orders.length} {template}
            {orders.length === 1 ? '' : 's'}. Use “Save as PDF” if you need files.
          </p>
        ) : null}
      </div>
    </PageShell>
  );
}

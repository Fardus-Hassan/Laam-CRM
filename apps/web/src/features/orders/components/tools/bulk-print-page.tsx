'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import type { CrmColumnDef } from '@/components/data-table';
import type { OrderDetail } from '@laam/types';

import { StatusBadge } from '@/components/dashboard/status-badge';
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
  parseOrderPrintType,
  printHtmlDocument,
  type OrderPrintType,
} from '@/features/orders/components/shared/order-print';
import { OrderStatusDialog } from '@/features/orders/components/shared/order-status-dialog';
import { useOrderMutations } from '@/features/orders/hooks/use-order-mutations';
import { cn } from '@/lib/utils';

type PreviewRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  status: string;
};

const PREVIEW_COLUMNS: CrmColumnDef<PreviewRow>[] = [
  { id: 'order', header: 'Order', cell: ({ row }) => row.original.orderNumber },
  { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customerName },
  { id: 'phone', header: 'Phone', cell: ({ row }) => row.original.customerPhone },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} kind="order" />,
  },
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

const TEMPLATE_OPTIONS: { value: OrderPrintType; label: string }[] = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'packing', label: 'Packing slip' },
  { value: 'label', label: 'Shipping label' },
  { value: 'barcode', label: 'Barcode sticker' },
];

export function BulkPrintPage() {
  const searchParams = useSearchParams();
  const brand = useBrand();
  const { bulkAction, isLoading: statusUpdating } = useOrderMutations();
  const initialType = parseOrderPrintType(searchParams.get('type'));
  const initialIds = searchParams.get('ids') ?? '';
  const shouldAutoPrint = searchParams.get('autoprint') === '1';

  const [step, setStep] = React.useState(initialIds ? 2 : 1);
  const [orderIdsInput, setOrderIdsInput] = React.useState(initialIds);
  const [template, setTemplate] = React.useState<OrderPrintType>(initialType);
  const [orders, setOrders] = React.useState<OrderDetail[]>([]);
  const [missing, setMissing] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [printing, setPrinting] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const autoStartedRef = React.useRef(false);

  const previewRows: PreviewRow[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    amount: order.amount,
    status: order.status,
  }));

  const sharedStatus =
    orders.length > 0 && orders.every((o) => o.status === orders[0]?.status)
      ? orders[0]!.status
      : '';

  const openPrint = React.useCallback(
    (list: OrderDetail[], printType: OrderPrintType) => {
      if (list.length === 0) {
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
          orders: list,
          type: printType,
          brandName: brand.name?.trim() || 'Store',
          logoUrl: absoluteUrl(logoUrl),
          primaryColor: brand.colors.primary || '#127A3B',
        });
        printHtmlDocument(html, { barcode: printType === 'barcode' });
        setStep(3);
        toast.success(
          printType === 'barcode'
            ? `Print dialog opened for ${list.length} barcode(s)`
            : `Print dialog opened for ${list.length} document(s)`,
        );
      } catch {
        toast.error('Could not open print dialog. Try again.');
      } finally {
        setPrinting(false);
      }
    },
    [brand],
  );

  const loadOrders = React.useCallback(
    async (idsRaw: string, opts?: { autoPrint?: boolean; printType?: OrderPrintType }) => {
      const ids = [
        ...new Set(
          idsRaw
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ];
      if (ids.length === 0) {
        toast.error('Enter at least one order ID or number');
        return [];
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
          setStep(1);
          return [];
        }
        if (notFound.length > 0) {
          toast.warning(`${notFound.length} ID(s) not found — continuing with ${found.length}`);
        }
        setStep(2);
        if (opts?.autoPrint) {
          openPrint(found, opts.printType ?? template);
        }
        return found;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not load orders');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [openPrint, template],
  );

  React.useEffect(() => {
    if (!initialIds || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void loadOrders(initialIds, {
      autoPrint: shouldAutoPrint,
      printType: initialType,
    });
  }, [initialIds, initialType, loadOrders, shouldAutoPrint]);

  async function loadPreview() {
    await loadOrders(orderIdsInput);
  }

  function handlePrint() {
    openPrint(orders, template);
  }

  async function handleBulkStatusChange(
    status: string,
    meta?: { fulfillmentWarehouseId?: string; followUpDate?: string },
  ) {
    const orderIds = orders.map((o) => o.id);
    if (orderIds.length === 0) return;
    await bulkAction({
      action: 'status_change',
      orderIds,
      status,
      ...(meta?.fulfillmentWarehouseId
        ? { fulfillmentWarehouseId: meta.fulfillmentWarehouseId }
        : {}),
      ...(meta?.followUpDate ? { followUpDate: meta.followUpDate } : {}),
    });
    setOrders((prev) => prev.map((o) => ({ ...o, status: status as OrderDetail['status'] })));
  }

  return (
    <PageShell
      title="Bulk Print"
      description="Print invoices, packing slips, shipping labels, or barcode stickers."
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
                {loading ? ' — loading…' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
              <FormField label="Print template">
                <FormSelect
                  value={template}
                  onChange={(value) => setTemplate(value as OrderPrintType)}
                  options={TEMPLATE_OPTIONS}
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
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={orders.length === 0 || statusUpdating}
                  onClick={() => setStatusOpen(true)}
                >
                  Status
                </Button>
                <Button
                  type="button"
                  onClick={handlePrint}
                  disabled={printing || orders.length === 0}
                >
                  {printing
                    ? 'Opening…'
                    : template === 'barcode'
                      ? 'Print barcodes'
                      : 'Print / Save PDF'}
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

      <OrderStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        currentStatus={sharedStatus}
        allowSameStatus
        title={
          orders.length > 1
            ? `Change status for ${orders.length} orders`
            : 'Change order status'
        }
        onSelect={handleBulkStatusChange}
      />
    </PageShell>
  );
}

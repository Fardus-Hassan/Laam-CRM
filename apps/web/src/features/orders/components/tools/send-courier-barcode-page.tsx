'use client';

import * as React from 'react';
import { toast } from 'sonner';

import type { CrmColumnDef } from '@/components/data-table';
import type { OrderListRow } from '@laam/types';

import { CrmDataTable } from '@/components/data-table';
import { EmptyState } from '@/components/layout/empty-state';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ordersApi } from '@/features/orders/api/orders-api';
import { useOrderMutations } from '@/features/orders/hooks/use-order-mutations';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

const SCAN_COLUMNS: CrmColumnDef<OrderListRow>[] = [
  { id: 'order', header: 'Order', cell: ({ row }) => row.original.orderNumber },
  { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customerName },
  { id: 'status', header: 'Status', cell: ({ row }) => row.original.status },
];

export function SendCourierBarcodePage() {
  const [barcode, setBarcode] = React.useState('');
  const [scannedRows, setScannedRows] = React.useState<OrderListRow[]>([]);
  const [courier, setCourier] = React.useState('pathao');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const { bulkAction, isLoading } = useOrderMutations();

  async function handleScan() {
    const code = barcode.trim();
    if (!code) return;

    const response = await ordersApi.listOrderRows({ search: code, page: 1, pageSize: 1 });
    const row = response.items[0];
    if (!row) {
      toast.error(`No order found for barcode: ${code}`);
      return;
    }
    if (scannedRows.some((r) => r.id === row.id)) {
      toast.info('Order already in list');
    } else {
      setScannedRows((prev) => [...prev, row]);
      toast.success(`Added ${row.orderNumber}`);
    }
    setBarcode('');
  }

  async function handleSubmit() {
    await bulkAction({
      action: 'courier_submit',
      orderIds: scannedRows.map((r) => r.id),
      courier,
    });
    setConfirmOpen(false);
    setScannedRows([]);
    toast.success('Submitted to courier');
  }

  return (
    <PageShell
      title="Send Courier by Barcode"
      description="Scan or type barcodes to bulk-submit orders to courier."
    >
      <div className={ORDER_PAGE_GAP}>
        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Scan barcode</CardTitle>
          </CardHeader>
          <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
            <div className="flex gap-2">
              <FormField label="Barcode / Order ID" className="flex-1">
                <FormInput
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void handleScan())}
                  placeholder="Scan or type ORD-1001"
                  autoFocus
                />
              </FormField>
              <Button type="button" className="mt-6" onClick={() => void handleScan()}>
                Add
              </Button>
            </div>
            <FormField label="Courier">
              <FormSelect
                value={courier}
                onChange={setCourier}
                options={[
                  { value: 'pathao', label: 'Pathao' },
                  { value: 'steadfast', label: 'Steadfast' },
                  { value: 'carrybee', label: 'Carrybee' },
                ]}
                searchable={false}
              />
            </FormField>
          </CardContent>
        </Card>

        <Card className={cn(ORDER_CARD_CLASS, 'overflow-hidden')}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Scanned orders ({scannedRows.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {scannedRows.length === 0 ? (
              <EmptyState
                title="No orders scanned"
                description="Scan or type an order barcode above to add it to the batch."
              />
            ) : (
              <CrmDataTable
                columns={SCAN_COLUMNS}
                data={scannedRows}
                getRowId={(row) => row.id}
                showPagination={false}
                showToolbar={false}
                manualPagination={false}
              />
            )}
          </CardContent>
        </Card>

        <Button
          type="button"
          disabled={scannedRows.length === 0}
          onClick={() => setConfirmOpen(true)}
        >
          Submit {scannedRows.length} order(s) to courier
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm courier submit</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Submit {scannedRows.length} order(s) to {courier}?
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={isLoading} onClick={() => void handleSubmit()}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

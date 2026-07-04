'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import type { CrmColumnDef } from '@/components/data-table';
import type { OrderListRow } from '@laam/types';

import { CrmDataTable } from '@/components/data-table';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stepper } from '@/components/ui/stepper';
import { ordersApi } from '@/features/orders/api/orders-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

const PREVIEW_COLUMNS: CrmColumnDef<OrderListRow>[] = [
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
  const [step, setStep] = React.useState(1);
  const [orderIdsInput, setOrderIdsInput] = React.useState(searchParams.get('ids') ?? '');
  const [template, setTemplate] = React.useState('invoice');
  const [previewRows, setPreviewRows] = React.useState<OrderListRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  async function loadPreview() {
    const ids = orderIdsInput
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      toast.error('Enter at least one order ID');
      return;
    }
    setLoading(true);
    try {
      const rows: OrderListRow[] = [];
      for (const id of ids) {
        const response = await ordersApi.listOrderRows({ search: id, page: 1, pageSize: 1 });
        if (response.items[0]) {
          rows.push(response.items[0]);
        }
      }
      setPreviewRows(rows);
      setStep(2);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    toast.success(`${previewRows.length} ${template}(s) queued for print`);
    setStep(3);
  }

  return (
    <PageShell title="Bulk Print" description="Print invoices, packing slips, or labels for multiple orders.">
      <div className={ORDER_PAGE_GAP}>
        <Stepper steps={BULK_PRINT_STEPS} currentStep={step} />

        {step === 1 ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Order IDs</CardTitle>
            </CardHeader>
            <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
              <FormField label="Paste order numbers (comma or newline separated)">
                <FormInput
                  value={orderIdsInput}
                  onChange={(e) => setOrderIdsInput(e.target.value)}
                  placeholder="ORD-1001, ORD-1002"
                />
              </FormField>
              <Button type="button" onClick={loadPreview} disabled={loading}>
                Next — choose template
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {step >= 2 ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">
                Template & preview ({previewRows.length} orders)
              </CardTitle>
            </CardHeader>
            <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
              <FormField label="Print template">
                <FormSelect
                  value={template}
                  onChange={setTemplate}
                  options={[
                    { value: 'invoice', label: 'Invoice' },
                    { value: 'packing', label: 'Packing slip' },
                    { value: 'label', label: 'Shipping label' },
                  ]}
                  searchable={false}
                />
              </FormField>
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
                <Button type="button" onClick={handlePrint}>
                  Queue print job
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === 3 ? (
          <p className="text-sm text-muted-foreground">
            Print job queued for {previewRows.length} order(s). Connect your PDF service to complete
            the workflow.
          </p>
        ) : null}
      </div>
    </PageShell>
  );
}

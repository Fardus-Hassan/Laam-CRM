'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormSelect } from '@/components/form/form-select';
import { FormInput } from '@/components/form/form-input';
import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent } from '@/components/ui/card';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { PaymentDataTable } from '@/features/orders/components/tools/payment-data-table';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
} from '@/features/orders/components/create-order/section-layout';
import { orderPaymentsApi } from '@/features/orders/api/order-payments-api';
import { useOrderPaymentsList } from '@/features/orders/hooks/use-order-payments-list';
import { formatCurrency } from '@/lib/format';
import type { OrderPaymentMethod, OrderPaymentRecordStatus } from '@laam/types';
import { cn } from '@/lib/utils';

export function OrderPaymentsPage() {
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [method, setMethod] = React.useState('');
  const [page, setPage] = React.useState(1);

  const { data, isLoading, refresh } = useOrderPaymentsList({
    search: search || undefined,
    status: (status || undefined) as OrderPaymentRecordStatus | undefined,
    method: (method || undefined) as OrderPaymentMethod | undefined,
    page,
    pageSize: 10,
  });

  async function handleReconcile(row: { id: string }) {
    await orderPaymentsApi.reconcilePayment(row.id);
    toast.success('Payment reconciled');
    void refresh();
  }

  return (
    <PageShell title="Order Payments" description="Payment ledger and collection tracking.">
      <div className={ORDER_PAGE_GAP}>
        {data ? (
          <CrmSummaryStrip
            items={[
              {
                id: 'collected',
                label: 'Collected',
                value: formatCurrency(data.summary.totalCollected),
              },
              {
                id: 'pending',
                label: 'Pending',
                value: formatCurrency(data.summary.totalPending),
              },
              {
                id: 'records',
                label: 'Records',
                value: data.summary.recordCount.toLocaleString(),
              },
              {
                id: 'shown',
                label: 'Showing',
                value: `${data.items.length} of ${data.total}`,
              },
            ]}
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Search">
            <FormInput
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Order or customer"
            />
          </FormField>
          <FormField label="Status">
            <FormSelect
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'collected', label: 'Collected' },
                { value: 'reconciled', label: 'Reconciled' },
              ]}
              searchable={false}
            />
          </FormField>
          <FormField label="Method">
            <FormSelect
              value={method}
              onChange={(v) => {
                setMethod(v);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All' },
                { value: 'cod', label: 'COD' },
                { value: 'bkash', label: 'bKash' },
                { value: 'nagad', label: 'Nagad' },
              ]}
              searchable={false}
            />
          </FormField>
        </div>

        <Card className={cn(ORDER_CARD_CLASS, 'overflow-hidden')}>
          <CardContent className="p-0">
            <PaymentDataTable
              rows={data?.items ?? []}
              isLoading={isLoading}
              page={page}
              pageSize={10}
              total={data?.total}
              onPageChange={setPage}
              onReconcile={handleReconcile}
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

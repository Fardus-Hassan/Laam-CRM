'use client';

import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_GRID_GAP,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

export function BulkPrintPage() {
  return (
    <PageShell
      title="Bulk Print"
      description="Print invoices, barcodes, and packing slips for selected orders."
    >
      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">Print options</CardTitle>
        </CardHeader>
        <CardContent className={cn('grid sm:grid-cols-2', ORDER_SECTION_BODY_CLASS, ORDER_SECTION_GRID_GAP)}>
          <FormField label="Order IDs">
            <FormInput placeholder="Paste order IDs or scan barcodes" />
          </FormField>
          <FormField label="Print template">
            <FormSelect
              value="invoice"
              onChange={() => undefined}
              options={[
                { value: 'invoice', label: 'Invoice' },
                { value: 'barcode', label: 'Barcode' },
                { value: 'packing', label: 'Packing slip' },
              ]}
              searchable={false}
            />
          </FormField>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="button" onClick={() => toast.success('Print queued — prototype')}>
              Print Selected
            </Button>
            <Button type="button" variant="outline" onClick={() => toast.info('Preview — prototype')}>
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

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

export function SendCourierBarcodePage() {
  return (
    <PageShell
      title="Send Courier by Barcode"
      description="Scan order barcodes and submit to courier in bulk."
    >
      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">Barcode submission</CardTitle>
        </CardHeader>
        <CardContent className={cn('grid sm:grid-cols-2', ORDER_SECTION_BODY_CLASS, ORDER_SECTION_GRID_GAP)}>
          <FormField label="Courier">
            <FormSelect
              value="pathao"
              onChange={() => undefined}
              options={[
                { value: 'pathao', label: 'Pathao' },
                { value: 'steadfast', label: 'Steadfast' },
                { value: 'carrybee', label: 'CarryBee' },
              ]}
              searchable={false}
            />
          </FormField>
          <FormField label="Scan barcode">
            <FormInput placeholder="Scan or type barcode" autoFocus />
          </FormField>
          <div className="sm:col-span-2">
            <Button type="button" onClick={() => toast.success('Submitted to courier — prototype')}>
              Submit to Courier
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

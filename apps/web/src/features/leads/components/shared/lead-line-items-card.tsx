'use client';

import type { LeadDetail } from '@laam/types';
import { Package } from 'lucide-react';

import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';

type LeadLineItemsCardProps = {
  lead: LeadDetail;
};

export function LeadLineItemsCard({ lead }: LeadLineItemsCardProps) {
  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Package className="size-4 text-primary" />
          Products ({lead.lineItems.length})
        </CardTitle>
      </CardHeader>
      <CardContent className={ORDER_SECTION_BODY_CLASS}>
        {lead.lineItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products added yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium text-right">Qty</th>
                  <th className="px-3 py-2 font-medium text-right">Unit</th>
                  <th className="px-3 py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {lead.lineItems.map((line) => (
                  <tr key={line.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{line.productName}</p>
                      {line.sku ? (
                        <p className="text-xs text-muted-foreground">{line.sku}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{line.quantity}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatCurrency(line.unitPrice)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                      {formatCurrency(line.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {lead.lineItems.length > 0 ? (
          <p className="mt-3 text-right text-sm font-semibold tabular-nums">
            Subtotal:{' '}
            {formatCurrency(lead.lineItems.reduce((sum, line) => sum + line.lineTotal, 0))}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

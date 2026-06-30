'use client';

import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';

const MOCK_PAYMENTS = [
  { id: 'pay-1', orderId: 'ORD-1001', customer: 'Rahim Uddin', method: 'bKash', amount: 2850, date: '30/06/2026' },
  { id: 'pay-2', orderId: 'ORD-1005', customer: 'Sakib Ahmed', method: 'COD', amount: 4120, date: '29/06/2026' },
  { id: 'pay-3', orderId: 'ORD-1016', customer: 'Anika Rahman', method: 'Nagad', amount: 1960, date: '28/06/2026' },
];

export function OrderPaymentsPage() {
  return (
    <PageShell
      title="Order Payments"
      description="Payment ledger and collection tracking."
    >
      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">Recent payments</CardTitle>
        </CardHeader>
        <CardContent className={ORDER_SECTION_BODY_CLASS}>
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Method</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_PAYMENTS.map((payment) => (
                  <tr key={payment.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2.5 font-medium">{payment.orderId}</td>
                    <td className="px-3 py-2.5">{payment.customer}</td>
                    <td className="px-3 py-2.5">{payment.method}</td>
                    <td className="px-3 py-2.5 tabular-nums">{formatCurrency(payment.amount)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{payment.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

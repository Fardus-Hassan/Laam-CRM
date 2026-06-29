'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';

type OrdersSalesSummaryProps = {
  orderCount: number;
  totalAmount: number;
};

export function OrdersSalesSummary({ orderCount, totalAmount }: OrdersSalesSummaryProps) {
  if (orderCount === 0) {
    return null;
  }

  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="text-sm">Sales Summary ({orderCount} orders)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4 text-sm">
        <div className="flex justify-between">
          <span>Total Sales Product Total</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Total Courier Charge</span>
          <span>{formatCurrency(0)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Net Income (prototype)</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

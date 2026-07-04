'use client';

import type { OrderSalesSummary } from '@laam/types';

import { CollapsibleSection } from '@/components/form/collapsible-section';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type OrderSalesSummaryPanelProps = {
  summary: OrderSalesSummary;
};

export function OrderSalesSummaryPanel({ summary }: OrderSalesSummaryPanelProps) {
  const lines: Array<{ label: string; value: number; highlight?: 'accent' | 'bold' }> = [
    {
      label: `Total Sales Product Total (${summary.orderCount} Orders)`,
      value: summary.productTotal,
    },
    { label: 'Total Shipping Charge Collected from Customer', value: summary.shippingCollected },
    {
      label: 'Order Total with Collected Shipping Charge',
      value: summary.orderTotalWithShipping,
    },
    { label: 'Courier Charge From API', value: summary.courierChargeApi, highlight: 'accent' },
    { label: 'Courier Charge Other Expense', value: summary.courierChargeOther, highlight: 'accent' },
    { label: 'Total Courier Charge', value: summary.totalCourierCharge, highlight: 'accent' },
    { label: 'After Reducing Courier Charge', value: summary.afterCourierCharge, highlight: 'bold' },
    {
      label: `Purchase Amount of Sold Items`,
      value: summary.purchaseAmount,
    },
    {
      label: `Sales Profit/Loss`,
      value: summary.salesProfitLoss,
      highlight: 'bold',
    },
    { label: 'Other Expense', value: summary.otherExpense },
    { label: 'Net Income', value: summary.netIncome, highlight: 'bold' },
  ];

  return (
    <CollapsibleSection title="Sales Summary" defaultOpen={false}>
      <div className="overflow-x-auto rounded-lg border border-border/70">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.label} className="border-b last:border-b-0">
                <td className="px-3 py-2 text-muted-foreground">{line.label}</td>
                <td
                  className={cn(
                    'px-3 py-2 text-right tabular-nums',
                    line.highlight === 'accent' && 'text-primary',
                    line.highlight === 'bold' && 'font-semibold text-foreground',
                  )}
                >
                  {formatCurrency(line.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  );
}

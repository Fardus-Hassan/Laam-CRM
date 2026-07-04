'use client';

import * as React from 'react';
import type { BillingOverview } from '@laam/types';
import { CreditCard, Download, MessageSquare, Package, RefreshCw, Users, Zap } from 'lucide-react';

import { Can } from '@/components/auth/can';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { billingApi } from '@/features/billing/api/billing-api';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
  pending: 'Pending',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  paid: 'success',
  pending: 'warning',
  overdue: 'destructive',
  cancelled: 'secondary',
};

export function BillingOverviewPage() {
  const [data, setData] = React.useState<BillingOverview | null>(null);
  const [recharging, setRecharging] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const overview = await billingApi.getOverview();
    setData(overview);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const sub = data?.subscription;

  async function handleRecharge() {
    if (!data?.paymentMethods[0]) return;
    setRecharging(true);
    try {
      const next = await billingApi.rechargeCredits({
        amountBdt: 1000,
        paymentMethodId: data.paymentMethods[0].id,
      });
      setData(next);
    } finally {
      setRecharging(false);
    }
  }

  const smsPercent = sub ? Math.round((sub.smsCreditsUsed / sub.smsCredits) * 100) : 0;
  const orderPercent = sub ? Math.round((sub.ordersUsed / sub.orderQuota) * 100) : 0;
  const seatPercent = sub ? Math.round((sub.usersActive / sub.userSeats) * 100) : 0;

  return (
    <PageShell
      title="Billing"
      description="Your Laam subscription, SMS credits, and invoices."
    >
      <div className={ORDER_PAGE_GAP}>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>

        <CrmSummaryStrip
          items={[
            { id: 'plan', label: 'Current plan', value: sub?.plan ?? '—' },
            { id: 'amount', label: 'Monthly', value: sub ? formatCurrency(sub.amountBdt) : '—' },
            { id: 'next', label: 'Next billing', value: sub?.nextBillingDate ?? '—' },
            { id: 'outstanding', label: 'Outstanding', value: data ? formatCurrency(data.outstandingBdt) : '—' },
          ]}
          className="sm:grid-cols-2 lg:grid-cols-4"
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className={cn(ORDER_CARD_CLASS, 'lg:col-span-2')}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Subscription</CardTitle>
                <Badge variant={sub?.status === 'active' ? 'success' : 'warning'}>
                  {sub?.status ?? '—'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-5')}>
              <div className="grid gap-4 sm:grid-cols-3">
                <UsageMeter icon={MessageSquare} label="SMS credits" used={sub?.smsCreditsUsed ?? 0} total={sub?.smsCredits ?? 0} percent={smsPercent} />
                <UsageMeter icon={Package} label="Orders" used={sub?.ordersUsed ?? 0} total={sub?.orderQuota ?? 0} percent={orderPercent} />
                <UsageMeter icon={Users} label="Team seats" used={sub?.usersActive ?? 0} total={sub?.userSeats ?? 0} percent={seatPercent} />
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Period: {sub?.currentPeriodStart} → {sub?.currentPeriodEnd}</span>
                <span>·</span>
                <span>{sub?.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} billing</span>
                <span>·</span>
                <span>Auto-renew: {sub?.autoRenew ? 'On' : 'Off'}</span>
              </div>
              <Can permission="billing.manage">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => void handleRecharge()} disabled={recharging}>
                    <Zap className="size-4" />
                    {recharging ? 'Recharging…' : 'Recharge SMS (৳1,000)'}
                  </Button>
                  <Button type="button" size="sm" variant="outline">Change plan</Button>
                </div>
              </Can>
            </CardContent>
          </Card>

          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Payment methods</CardTitle>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
              {data?.paymentMethods.map((pm) => (
                <div key={pm.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{pm.label}</p>
                      {pm.lastFour ? (
                        <p className="text-xs text-muted-foreground">•••• {pm.lastFour}</p>
                      ) : null}
                    </div>
                  </div>
                  {pm.isDefault ? <Badge variant="secondary" className="text-[10px]">Default</Badge> : null}
                </div>
              ))}
              <Can permission="billing.manage">
                <Button type="button" size="sm" variant="outline" className="w-full">Add payment method</Button>
              </Can>
            </CardContent>
          </Card>
        </div>

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex-row items-center justify-between')}>
            <CardTitle className="text-sm">Invoices</CardTitle>
            <p className="text-xs text-muted-foreground">
              Total paid: {data ? formatCurrency(data.totalPaidBdt) : '—'}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.recentInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.number}</TableCell>
                    <TableCell>{inv.periodLabel}</TableCell>
                    <TableCell>{inv.date}</TableCell>
                    <TableCell>{formatCurrency(inv.amountBdt)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[inv.status] ?? 'secondary'}>
                        {STATUS_LABELS[inv.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" size="sm" variant="ghost">
                        <Download className="size-4" />
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function UsageMeter({
  icon: Icon,
  label,
  used,
  total,
  percent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  used: number;
  total: number;
  percent: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <Progress value={percent} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {used.toLocaleString()} / {total.toLocaleString()} ({percent}%)
      </p>
    </div>
  );
}

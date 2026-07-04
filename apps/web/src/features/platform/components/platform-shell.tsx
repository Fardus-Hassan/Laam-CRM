'use client';

import * as React from 'react';
import type { BillingPlanOption, PlatformBillingTenant } from '@laam/types';
import { Activity, Building2, CreditCard, Layers, Server, Shield } from 'lucide-react';

import { PlatformTenantsPanel } from '@/features/platform/components/platform-tenants-panel';
import { billingApi } from '@/features/billing/api/billing-api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'tenants', label: 'Tenants', icon: Building2 },
  { id: 'onboarding', label: 'Onboarding', icon: Shield },
  { id: 'health', label: 'Health', icon: Activity },
  { id: 'api', label: 'API Gateway', icon: Server },
  { id: 'plans', label: 'Plans', icon: Layers },
  { id: 'billing', label: 'Billing', icon: CreditCard },
] as const;

type TabId = (typeof TABS)[number]['id'];

type PlatformShellProps = {
  activeTab?: string;
};

export function PlatformShell({ activeTab = 'tenants' }: PlatformShellProps) {
  const tab = (TABS.some((t) => t.id === activeTab) ? activeTab : 'tenants') as TabId;

  return (
    <div className={ORDER_PAGE_GAP}>
      <div className="flex flex-wrap gap-1 border-b pb-2">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`/dashboard/platform?tab=${t.id}`}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
              tab === t.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </a>
        ))}
      </div>

      {tab === 'tenants' || tab === 'onboarding' ? (
        <PlatformTenantsPanel initialTab={tab} />
      ) : null}
      {tab === 'health' ? <PlatformHealthPanel /> : null}
      {tab === 'api' ? <PlatformApiPanel /> : null}
      {tab === 'plans' ? <PlatformPlansPanel /> : null}
      {tab === 'billing' ? <PlatformBillingPanel /> : null}
    </div>
  );
}

function PlatformHealthPanel() {
  const metrics = [
    { label: 'API uptime', value: '99.97%', status: 'good' },
    { label: 'Avg response', value: '124ms', status: 'good' },
    { label: 'Active tenants', value: '47', status: 'good' },
    { label: 'Failed jobs (24h)', value: '3', status: 'warn' },
    { label: 'DB connections', value: '82 / 200', status: 'good' },
    { label: 'Queue backlog', value: '12', status: 'good' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((m) => (
        <Card key={m.label} className={ORDER_CARD_CLASS}>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-1')}>
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="text-2xl font-semibold">{m.value}</p>
            <Badge variant={m.status === 'warn' ? 'warning' : 'success'} className="text-[10px]">
              {m.status === 'warn' ? 'Attention' : 'Healthy'}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PlatformApiPanel() {
  const endpoints = [
    { method: 'GET', path: '/api/v1/orders', rate: '120/min', status: 'active' },
    { method: 'POST', path: '/api/v1/orders', rate: '60/min', status: 'active' },
    { method: 'GET', path: '/api/v1/leads', rate: '200/min', status: 'active' },
    { method: 'POST', path: '/api/v1/webhooks/courier', rate: '500/min', status: 'active' },
    { method: 'POST', path: '/api/v1/sms/send', rate: '30/min', status: 'throttled' },
  ];

  return (
    <Card className={ORDER_CARD_CLASS}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">API Gateway routes</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Method</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Rate limit</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {endpoints.map((ep) => (
              <TableRow key={ep.path + ep.method}>
                <TableCell><Badge variant="outline">{ep.method}</Badge></TableCell>
                <TableCell className="font-mono text-sm">{ep.path}</TableCell>
                <TableCell>{ep.rate}</TableCell>
                <TableCell>
                  <Badge variant={ep.status === 'active' ? 'success' : 'warning'}>{ep.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PlatformPlansPanel() {
  const [plans, setPlans] = React.useState<BillingPlanOption[]>([]);

  React.useEffect(() => {
    void billingApi.listPlanOptions().then(setPlans);
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plans.map((plan) => (
        <Card key={plan.id} className={cn(ORDER_CARD_CLASS, plan.isPopular && 'border-primary')}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{plan.name}</CardTitle>
              {plan.isPopular ? <Badge>Popular</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4')}>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(plan.monthlyBdt)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="text-xs text-muted-foreground">{formatCurrency(plan.yearlyBdt)}/year</p>
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {plan.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div><p className="font-semibold text-foreground">{plan.smsCredits.toLocaleString()}</p><p>SMS</p></div>
              <div><p className="font-semibold text-foreground">{plan.orderQuota.toLocaleString()}</p><p>Orders</p></div>
              <div><p className="font-semibold text-foreground">{plan.userSeats}</p><p>Seats</p></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PlatformBillingPanel() {
  const [tenants, setTenants] = React.useState<PlatformBillingTenant[]>([]);

  React.useEffect(() => {
    void billingApi.listPlatformBilling().then(setTenants);
  }, []);

  const totalMrr = tenants.reduce((s, t) => s + t.mrrBdt, 0);
  const totalOutstanding = tenants.reduce((s, t) => s + t.outstandingBdt, 0);

  return (
    <div className={ORDER_PAGE_GAP}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className={ORDER_CARD_CLASS}>
          <CardContent className={ORDER_SECTION_BODY_CLASS}>
            <p className="text-xs text-muted-foreground">Monthly recurring revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(totalMrr)}</p>
          </CardContent>
        </Card>
        <Card className={ORDER_CARD_CLASS}>
          <CardContent className={ORDER_SECTION_BODY_CLASS}>
            <p className="text-xs text-muted-foreground">Total outstanding</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className={ORDER_CARD_CLASS}>
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">Tenant billing</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MRR</TableHead>
                <TableHead>Last payment</TableHead>
                <TableHead>Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t) => (
                <TableRow key={t.tenantId}>
                  <TableCell className="font-medium">{t.tenantName}</TableCell>
                  <TableCell>{t.plan}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'active' ? 'success' : t.status === 'past_due' ? 'warning' : 'destructive'}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(t.mrrBdt)}</TableCell>
                  <TableCell>{t.lastPaymentDate ?? '—'}</TableCell>
                  <TableCell>{t.outstandingBdt > 0 ? formatCurrency(t.outstandingBdt) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

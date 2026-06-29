'use client';

import * as React from 'react';

import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { FailedOrdersTable } from '@/features/orders/components/failed-orders-table';
import {
  FAILED_ORDER_WEBSITES,
  filterMockFailedOrders,
} from '@/features/orders/data/mock-failed-orders';

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs';

export function FailedOrdersListPage() {
  const [search, setSearch] = React.useState('');
  const [failedType, setFailedType] = React.useState<string>('all');
  const [website, setWebsite] = React.useState('all');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 150);
    return () => window.clearTimeout(timer);
  }, []);

  const data = filterMockFailedOrders({
    search: search || undefined,
    failedType:
      failedType === 'all'
        ? undefined
        : (failedType as 'duplicate' | 'blocked' | 'other'),
    website: website === 'all' ? undefined : website,
    page: 1,
    pageSize: 10,
  });

  return (
    <PageShell
      title="Failed Orders"
      description="Duplicate, blocked, or invalid orders for manual review. Auto-deleted after 90 days."
    >
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-sm">Filtering</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="failedType">Type</Label>
                <select
                  id="failedType"
                  value={failedType}
                  onChange={(event) => setFailedType(event.target.value)}
                  className={selectClassName}
                >
                  <option value="all">All</option>
                  <option value="duplicate">Duplicate</option>
                  <option value="blocked">Blocked</option>
                  <option value="other">Without Duplicate/Blocked</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <select
                  id="website"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  className={selectClassName}
                >
                  <option value="all">All</option>
                  {FAILED_ORDER_WEBSITES.map((site) => (
                    <option key={site} value={site}>
                      {site}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Search</Label>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search customer, phone, address…"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-sm">Failed Order Report (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total failed tracked</span>
                <span>{data.report.totalTracked.toLocaleString()} orders</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confirmed</span>
                <span className="text-emerald-600">{data.report.confirmed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Failed to confirmed</span>
                <span>{data.report.failedToConfirmedPercent}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground">
          NB: Failed order will delete automatically after 90 days!
        </p>

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm">Failed Order List</CardTitle>
          </CardHeader>
          <CardContent className="custom-scrollbar overflow-x-auto px-3 py-3 sm:px-4">
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <FailedOrdersTable rows={data.items} />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

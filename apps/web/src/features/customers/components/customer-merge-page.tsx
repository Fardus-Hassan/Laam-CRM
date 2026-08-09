'use client';

import * as React from 'react';
import Link from 'next/link';
import type { CustomerDetail, CustomerDuplicateGroup } from '@laam/types';
import { toast } from 'sonner';

import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { customersApi } from '@/features/customers/api/customers-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export function CustomerMergePage() {
  const [groups, setGroups] = React.useState<CustomerDuplicateGroup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [merging, setMerging] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await customersApi.findDuplicates();
      setGroups(res.groups);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load duplicates');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleMerge(primaryId: string, duplicateIds: string[]) {
    setMerging(true);
    try {
      const result = await customersApi.mergeCustomers({ primaryId, duplicateIds });
      toast.success(`Merged into ${result.name}`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Merge failed');
    } finally {
      setMerging(false);
    }
  }

  return (
    <PageShell
      title="Merge customers"
      description="Duplicate phones or same name+district — keep one profile, reassign orders."
    >
      <div className={ORDER_PAGE_GAP}>
        <div className="flex justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {loading
              ? 'Loading…'
              : `${groups.length} group${groups.length === 1 ? '' : 's'} with duplicates`}
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void refresh()} disabled={loading}>
              Refresh
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/dashboard/customers">Back to customers</Link>
            </Button>
          </div>
        </div>

        {!loading && !groups.length ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'py-10 text-center text-sm text-muted-foreground')}>
              No duplicate customers found. Phone-unique profiles are already enforced.
            </CardContent>
          </Card>
        ) : null}

        {groups.map((group) => (
          <DuplicateGroupCard
            key={group.phoneNormalized}
            phone={group.phone}
            customers={group.customers}
            onMerge={handleMerge}
            disabled={merging}
          />
        ))}
      </div>
    </PageShell>
  );
}

function DuplicateGroupCard({
  phone,
  customers,
  onMerge,
  disabled,
}: {
  phone: string;
  customers: CustomerDetail[];
  onMerge: (primaryId: string, duplicateIds: string[]) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [primaryId, setPrimaryId] = React.useState(customers[0]?.id ?? '');

  React.useEffect(() => {
    setPrimaryId(customers[0]?.id ?? '');
  }, [customers]);

  return (
    <Card className={ORDER_CARD_CLASS}>
      <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex-row items-center justify-between')}>
        <CardTitle className="text-sm font-mono">{phone}</CardTitle>
        <Badge variant="secondary">{customers.length} profiles</Badge>
      </CardHeader>
      <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
        {customers.map((c) => (
          <label
            key={c.id}
            className={cn(
              'flex cursor-pointer items-center justify-between rounded-md border px-3 py-2',
              primaryId === c.id && 'border-primary bg-primary/5',
            )}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name={`primary-${phone}`}
                checked={primaryId === c.id}
                onChange={() => setPrimaryId(c.id)}
                disabled={disabled}
              />
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.orderCount} orders · {formatCurrency(c.totalSpent)} · #{c.customerNumber}
                </p>
              </div>
            </div>
            {primaryId === c.id ? <Badge>Primary</Badge> : null}
          </label>
        ))}
        <Button
          type="button"
          size="sm"
          onClick={() =>
            void onMerge(
              primaryId,
              customers.filter((c) => c.id !== primaryId).map((c) => c.id),
            )
          }
          disabled={disabled || !primaryId || customers.length < 2}
        >
          Merge into primary
        </Button>
      </CardContent>
    </Card>
  );
}

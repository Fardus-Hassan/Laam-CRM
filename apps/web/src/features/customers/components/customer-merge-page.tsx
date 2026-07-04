'use client';

import * as React from 'react';
import Link from 'next/link';
import type { CustomerDetail } from '@laam/types';
import { toast } from 'sonner';

import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  findDuplicatePhones,
  mergeCustomers,
} from '@/features/customers/data/mock-customers';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export function CustomerMergePage() {
  const [groups, setGroups] = React.useState(findDuplicatePhones());

  function refresh() {
    setGroups(findDuplicatePhones());
  }

  function handleMerge(primaryId: string, duplicateIds: string[]) {
    const result = mergeCustomers(primaryId, duplicateIds);
    if (result) {
      toast.success(`Merged into ${result.name}`);
      refresh();
    } else {
      toast.error('Merge failed');
    }
  }

  return (
    <PageShell
      title="Merge customers"
      description="Duplicate phone numbers — keep one profile, remove the rest."
    >
      <div className={ORDER_PAGE_GAP}>
        <div className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            {groups.length} phone number{groups.length === 1 ? '' : 's'} with duplicates
          </p>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/dashboard/customers">Back to customers</Link>
          </Button>
        </div>

        {!groups.length ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'py-10 text-center text-sm text-muted-foreground')}>
              No duplicate phones found.
            </CardContent>
          </Card>
        ) : (
          groups.map((group) => (
            <DuplicateGroupCard
              key={group.phone}
              phone={group.phone}
              customers={group.customers}
              onMerge={handleMerge}
            />
          ))
        )}
      </div>
    </PageShell>
  );
}

function DuplicateGroupCard({
  phone,
  customers,
  onMerge,
}: {
  phone: string;
  customers: CustomerDetail[];
  onMerge: (primaryId: string, duplicateIds: string[]) => void;
}) {
  const [primaryId, setPrimaryId] = React.useState(customers[0]?.id ?? '');

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
            onMerge(
              primaryId,
              customers.filter((c) => c.id !== primaryId).map((c) => c.id),
            )
          }
          disabled={!primaryId || customers.length < 2}
        >
          Merge into primary
        </Button>
      </CardContent>
    </Card>
  );
}

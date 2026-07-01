'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { OrderStatusConfig, OrderStatusDisplayMode } from '@laam/types';

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
import {
  appendOrderStatus,
  getOrderStatuses,
  ORDER_STATUSES_CHANGED,
} from '@/features/orders/data/order-status-store';
import { cn } from '@/lib/utils';

export function OrderStatusesSettingsPage() {
  const [statuses, setStatuses] = React.useState<OrderStatusConfig[]>(() => getOrderStatuses());
  const [draft, setDraft] = React.useState({
    label: '',
    slug: '',
    displayMode: 'filter_only' as OrderStatusDisplayMode,
    color: 'hsl(174 58% 42%)',
  });

  React.useEffect(() => {
    function refresh() {
      setStatuses(getOrderStatuses());
    }
    window.addEventListener(ORDER_STATUSES_CHANGED, refresh);
    return () => window.removeEventListener(ORDER_STATUSES_CHANGED, refresh);
  }, []);

  function handleAdd() {
    if (!draft.label.trim() || !draft.slug.trim()) {
      toast.error('Label and slug are required');
      return;
    }

    const slug = draft.slug.trim().replace(/\s+/g, '_').toLowerCase();

    if (statuses.some((status) => status.slug === slug)) {
      toast.error('A status with this slug already exists');
      return;
    }

    appendOrderStatus({
      id: `status-${slug}`,
      slug: slug as OrderStatusConfig['slug'],
      label: draft.label.trim(),
      color: draft.color,
      group: 'intake',
      displayMode: draft.displayMode,
      isTerminal: false,
      isDefault: false,
      allowedTransitions: [],
      bulkActions: ['export'],
      showInGroupByStatus: true,
    });

    setStatuses(getOrderStatuses());
    setDraft({ label: '', slug: '', displayMode: 'filter_only', color: draft.color });
    toast.success('Status saved — persists across reloads in this browser');
  }

  return (
    <PageShell
      title="Order Statuses"
      description="Configure order pipeline statuses, sidebar placement, and nested tabs. Phase 2 will persist to database."
    >
      <div className="space-y-4">
        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Add status (demo)</CardTitle>
          </CardHeader>
          <CardContent className={cn('grid sm:grid-cols-2 lg:grid-cols-4', ORDER_SECTION_BODY_CLASS, ORDER_SECTION_GRID_GAP)}>
            <FormField label="Label">
              <FormInput
                value={draft.label}
                onChange={(event) => setDraft((d) => ({ ...d, label: event.target.value }))}
                placeholder="e.g. Pending 4"
              />
            </FormField>
            <FormField label="Slug">
              <FormInput
                value={draft.slug}
                onChange={(event) => setDraft((d) => ({ ...d, slug: event.target.value }))}
                placeholder="pending_4"
              />
            </FormField>
            <FormField label="Display mode">
              <FormSelect
                value={draft.displayMode}
                onChange={(displayMode) =>
                  setDraft((d) => ({ ...d, displayMode: displayMode as OrderStatusDisplayMode }))
                }
                options={[
                  { value: 'sidebar', label: 'Sidebar link' },
                  { value: 'nested_tab', label: 'Nested tab under parent' },
                  { value: 'filter_only', label: 'Filter only (All Orders)' },
                ]}
                searchable={false}
              />
            </FormField>
            <div className="flex items-end">
              <Button type="button" onClick={handleAdd}>
                Add status
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Configured statuses ({statuses.length})</CardTitle>
          </CardHeader>
          <CardContent className={ORDER_SECTION_BODY_CLASS}>
            <div className="overflow-x-auto rounded-lg border border-border/70">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Label</th>
                    <th className="px-3 py-2 font-medium">Slug</th>
                    <th className="px-3 py-2 font-medium">Group</th>
                    <th className="px-3 py-2 font-medium">Display</th>
                    <th className="px-3 py-2 font-medium">Parent</th>
                  </tr>
                </thead>
                <tbody>
                  {statuses.map((status) => (
                    <tr key={status.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2.5 font-medium">{status.label}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{status.slug}</td>
                      <td className="px-3 py-2.5 capitalize">{status.group}</td>
                      <td className="px-3 py-2.5">{status.displayMode}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {status.parentSlug ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Custom statuses are stored in localStorage for Phase 1 demos. API persistence in Phase 2.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

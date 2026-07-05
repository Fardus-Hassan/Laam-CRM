'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { OrderStatusConfig } from '@laam/types';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_GRID_GAP,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { MOCK_ORDER_QUEUE_PAGES } from '@/features/orders/data/mock-status-config';
import {
  appendOrderStatus,
  getOrderStatuses,
  ORDER_STATUSES_CHANGED,
  upsertOrderStatusOverride,
} from '@/features/orders/data/order-status-store';
import {
  statusShowsInNestedTabs,
  statusShowsInSidebar,
  statusVisibilityLabel,
} from '@/features/orders/lib/order-status-visibility';
import { cn } from '@/lib/utils';

const PARENT_QUEUE_OPTIONS = MOCK_ORDER_QUEUE_PAGES.filter(
  (page) => page.kind === 'list' && page.slug !== 'all' && page.slug !== 'more_statuses',
).map((page) => ({ value: page.slug, label: page.label }));

export function OrderStatusesSettingsPage() {
  const [statuses, setStatuses] = React.useState<OrderStatusConfig[]>(() => getOrderStatuses());
  const [draft, setDraft] = React.useState({
    label: '',
    slug: '',
    color: 'hsl(174 58% 42%)',
    showInSidebar: false,
    showInNestedTabs: false,
    parentSlug: '',
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
      displayMode: 'filter_only',
      showInSidebar: draft.showInSidebar,
      showInNestedTabs: draft.showInNestedTabs,
      parentSlug: draft.parentSlug || undefined,
      isTerminal: false,
      isDefault: false,
      allowedTransitions: [],
      bulkActions: ['export'],
      showInGroupByStatus: true,
    });

    setStatuses(getOrderStatuses());
    setDraft({
      label: '',
      slug: '',
      color: draft.color,
      showInSidebar: false,
      showInNestedTabs: false,
      parentSlug: '',
    });
    toast.success('Status saved');
  }

  function updateStatus(status: OrderStatusConfig, patch: Partial<OrderStatusConfig>) {
    const next = { ...status, ...patch };
    upsertOrderStatusOverride(next);
    setStatuses(getOrderStatuses());
    toast.success(`${next.label} updated`);
  }

  return (
    <PageShell
      title="Order Statuses"
      description="Control sidebar links, in-page tabs, and parent queues for each status."
    >
      <div className="space-y-4">
        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Add status</CardTitle>
          </CardHeader>
          <CardContent
            className={cn(
              'grid sm:grid-cols-2 lg:grid-cols-3',
              ORDER_SECTION_BODY_CLASS,
              ORDER_SECTION_GRID_GAP,
            )}
          >
            <FormField label="Label">
              <FormInput
                value={draft.label}
                onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
                placeholder="e.g. Pending 4"
              />
            </FormField>
            <FormField label="Slug">
              <FormInput
                value={draft.slug}
                onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))}
                placeholder="pending_4"
              />
            </FormField>
            <FormField label="Parent queue">
              <FormSelect
                value={draft.parentSlug}
                onChange={(parentSlug) => setDraft((current) => ({ ...current, parentSlug }))}
                options={[{ value: '', label: 'None (top-level under Orders)' }, ...PARENT_QUEUE_OPTIONS]}
                searchable={false}
              />
            </FormField>
            <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.showInSidebar}
                  onCheckedChange={(checked) =>
                    setDraft((current) => ({ ...current, showInSidebar: checked === true }))
                  }
                />
                Show in sidebar
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.showInNestedTabs}
                  onCheckedChange={(checked) =>
                    setDraft((current) => ({ ...current, showInNestedTabs: checked === true }))
                  }
                />
                Show in page tabs
              </label>
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
              <table className="w-full min-w-[960px] text-sm">
                <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Label</th>
                    <th className="px-3 py-2 font-medium">Slug</th>
                    <th className="px-3 py-2 font-medium">Parent queue</th>
                    <th className="px-3 py-2 font-medium">Sidebar</th>
                    <th className="px-3 py-2 font-medium">Page tabs</th>
                    <th className="px-3 py-2 font-medium">Effective</th>
                  </tr>
                </thead>
                <tbody>
                  {statuses.map((status) => (
                    <tr key={status.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2.5 font-medium">{status.label}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{status.slug}</td>
                      <td className="px-3 py-2.5">
                        <FormSelect
                          value={status.parentSlug ?? ''}
                          onChange={(parentSlug) =>
                            updateStatus(status, { parentSlug: parentSlug || undefined })
                          }
                          options={[
                            { value: '', label: 'None' },
                            ...PARENT_QUEUE_OPTIONS,
                          ]}
                          searchable={false}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <Checkbox
                          checked={statusShowsInSidebar(status)}
                          onCheckedChange={(checked) =>
                            updateStatus(status, { showInSidebar: checked === true })
                          }
                          aria-label={`Show ${status.label} in sidebar`}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <Checkbox
                          checked={statusShowsInNestedTabs(status)}
                          onCheckedChange={(checked) =>
                            updateStatus(status, { showInNestedTabs: checked === true })
                          }
                          aria-label={`Show ${status.label} in page tabs`}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {statusVisibilityLabel(status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Sidebar links appear under <strong>Orders</strong>. Statuses with a parent queue nest
              under that queue (e.g. Pending 2 under Call confirm). Enable both checkboxes to show a
              status in the sidebar and as an in-page tab. Changes persist in this browser via
              localStorage.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

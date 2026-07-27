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
import { orderStatusConfigApi } from '@/features/orders/api/order-status-config-api';
import {
  getOrderStatuses,
  ORDER_STATUSES_CHANGED,
  setServerOrderStatuses,
  upsertOrderStatusOverride,
} from '@/features/orders/data/order-status-store';
import { useOrderStatusConfig } from '@/features/orders/hooks/use-order-status-config';
import {
  getStatusParentOptions,
  resolveDisplayModeFromFlags,
  wouldCreateParentCycle,
} from '@/features/orders/lib/order-status-hierarchy';
import {
  statusShowsInNestedTabs,
  statusShowsInSidebar,
  statusVisibilityLabel,
} from '@/features/orders/lib/order-status-visibility';
import { cn } from '@/lib/utils';

const useApi = process.env.NEXT_PUBLIC_USE_API === 'true';

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function OrderStatusesSettingsPage() {
  const { statuses: liveStatuses, isLoading } = useOrderStatusConfig();
  const [statuses, setStatuses] = React.useState<OrderStatusConfig[]>(liveStatuses);
  const [draft, setDraft] = React.useState({
    label: '',
    slug: '',
    color: 'hsl(174 58% 42%)',
    showInSidebar: true,
    showInNestedTabs: false,
    parentSlug: '',
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setStatuses(liveStatuses);
  }, [liveStatuses]);

  React.useEffect(() => {
    function refresh() {
      setStatuses(getOrderStatuses());
    }
    window.addEventListener(ORDER_STATUSES_CHANGED, refresh);
    return () => window.removeEventListener(ORDER_STATUSES_CHANGED, refresh);
  }, []);

  const parentOptionsForDraft = React.useMemo(
    () => [
      { value: '', label: 'None — top-level under Orders' },
      ...getStatusParentOptions(draft.slug || undefined).map((option) => ({
        value: option.value,
        label: option.label,
      })),
    ],
    [draft.slug, statuses],
  );

  async function persistStatus(next: OrderStatusConfig) {
    if (!useApi) {
      upsertOrderStatusOverride(next);
      setStatuses(getOrderStatuses());
      return next;
    }

    const saved = await orderStatusConfigApi.upsert({
      id: next.id.startsWith('status-') ? undefined : next.id,
      slug: next.slug,
      label: next.label,
      labelBn: next.labelBn,
      color: next.color,
      group: next.group,
      parentSlug: next.parentSlug,
      displayMode: next.displayMode,
      showInSidebar: next.showInSidebar,
      showInNestedTabs: next.showInNestedTabs,
      sidebarOrder: next.sidebarOrder,
      isTerminal: next.isTerminal,
      isDefault: next.isDefault,
      allowedTransitions: next.allowedTransitions,
      bulkActions: next.bulkActions,
      showInGroupByStatus: next.showInGroupByStatus,
    });

    const current = getOrderStatuses();
    const merged = [...current.filter((item) => item.slug !== saved.slug), saved];
    setServerOrderStatuses(merged);
    setStatuses(merged);
    return saved;
  }

  async function handleAdd() {
    const label = draft.label.trim();
    const slug = draft.slug.trim() ? slugify(draft.slug) : slugify(label);
    if (!label || !slug) {
      toast.error('Label is required');
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(slug)) {
      toast.error('Slug must start with a letter (a-z) and use only a-z, 0-9, _');
      return;
    }
    if (statuses.some((status) => status.slug === slug)) {
      toast.error('A status with this slug already exists');
      return;
    }

    const parentSlug = draft.parentSlug || undefined;
    if (wouldCreateParentCycle(statuses, slug, parentSlug)) {
      toast.error('That parent would create a cycle');
      return;
    }

    setSaving(true);
    try {
      const showInSidebar = draft.showInSidebar;
      const showInNestedTabs = draft.showInNestedTabs;
      await persistStatus({
        id: `status-${slug}`,
        slug,
        label,
        color: draft.color,
        group: 'intake',
        displayMode: resolveDisplayModeFromFlags(showInSidebar, showInNestedTabs),
        showInSidebar,
        showInNestedTabs,
        parentSlug,
        isTerminal: false,
        isDefault: false,
        allowedTransitions: [],
        bulkActions: ['export', 'status_change', 'send_sms'],
        showInGroupByStatus: true,
        sidebarOrder: 90 + statuses.length,
      });

      setDraft({
        label: '',
        slug: '',
        color: draft.color,
        showInSidebar: true,
        showInNestedTabs: false,
        parentSlug: '',
      });
      toast.success(
        showInSidebar
          ? 'Status saved for this organization'
          : 'Status saved — enable “Show in sidebar” to appear in nav',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save status');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(status: OrderStatusConfig, patch: Partial<OrderStatusConfig>) {
    const nextParent =
      'parentSlug' in patch ? patch.parentSlug || undefined : status.parentSlug;
    if (wouldCreateParentCycle(statuses, status.slug, nextParent)) {
      toast.error('That parent would create a cycle');
      return;
    }

    const nextShowSidebar =
      'showInSidebar' in patch ? Boolean(patch.showInSidebar) : statusShowsInSidebar(status);
    const nextShowTabs =
      'showInNestedTabs' in patch
        ? Boolean(patch.showInNestedTabs)
        : statusShowsInNestedTabs(status);

    const next: OrderStatusConfig = {
      ...status,
      ...patch,
      parentSlug: nextParent,
      showInSidebar: nextShowSidebar,
      showInNestedTabs: nextShowTabs,
      displayMode: resolveDisplayModeFromFlags(nextShowSidebar, nextShowTabs),
    };

    try {
      await persistStatus(next);
      toast.success(`${next.label} updated`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  }

  return (
    <PageShell
      title="Order Statuses"
      description={
        useApi
          ? 'Organization-wide status config (saved to server — shared by all users).'
          : 'Define statuses, where they appear in the Orders nav, and optional parent nesting.'
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading organization statuses…</p>
        ) : null}
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
                onChange={(event) => {
                  const nextLabel = event.target.value;
                  setDraft((current) => ({
                    ...current,
                    label: nextLabel,
                    slug: current.slug ? current.slug : slugify(nextLabel),
                  }));
                }}
                placeholder="e.g. Pending 4"
              />
            </FormField>
            <FormField label="Slug">
              <FormInput
                value={draft.slug}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, slug: slugify(event.target.value) }))
                }
                placeholder="pending_4"
              />
            </FormField>
            <FormField label="Parent">
              <FormSelect
                value={draft.parentSlug}
                onChange={(parentSlug) => setDraft((current) => ({ ...current, parentSlug }))}
                options={parentOptionsForDraft}
                searchable
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
                Show as nested tab under parent
              </label>
              <Button type="button" onClick={() => void handleAdd()} disabled={saving || isLoading}>
                {saving ? 'Saving…' : 'Add status'}
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
                    <th className="px-3 py-2 font-medium">Parent</th>
                    <th className="px-3 py-2 font-medium">Sidebar</th>
                    <th className="px-3 py-2 font-medium">Nested tab</th>
                    <th className="px-3 py-2 font-medium">Effective</th>
                  </tr>
                </thead>
                <tbody>
                  {statuses.map((status) => {
                    const parentOptions = [
                      { value: '', label: 'None — top-level' },
                      ...getStatusParentOptions(status.slug).map((option) => ({
                        value: option.value,
                        label: option.label,
                      })),
                    ];
                    return (
                      <tr key={status.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2.5 font-medium">{status.label}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{status.slug}</td>
                        <td className="px-3 py-2.5">
                          <FormSelect
                            value={status.parentSlug ?? ''}
                            onChange={(parentSlug) =>
                              void updateStatus(status, {
                                parentSlug: parentSlug ? parentSlug : undefined,
                              })
                            }
                            options={parentOptions}
                            searchable
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <Checkbox
                            checked={statusShowsInSidebar(status)}
                            onCheckedChange={(checked) =>
                              void updateStatus(status, { showInSidebar: checked === true })
                            }
                            aria-label={`Show ${status.label} in sidebar`}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <Checkbox
                            checked={statusShowsInNestedTabs(status)}
                            onCheckedChange={(checked) =>
                              void updateStatus(status, { showInNestedTabs: checked === true })
                            }
                            aria-label={`Show ${status.label} as nested tab`}
                          />
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {statusVisibilityLabel(status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p>
                <strong>Parent = None</strong> + sidebar on → own link under Orders.
              </p>
              <p>
                <strong>Parent = queue</strong> + sidebar → nested under that queue.
              </p>
              <p>
                <strong>Nested tab</strong> on → tabs on that parent page.
              </p>
              <p>Changes save to the organization database for every user.</p>
            </div>
            <div className="mt-4 rounded-lg border border-border/70 p-3">
              <p className="mb-2 text-sm font-medium">Add custom queue folder</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <FormInput
                  placeholder="Label (e.g. VIP Desk)"
                  id="new-queue-label"
                />
                <FormInput placeholder="Slug (vip_desk)" id="new-queue-slug" />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const label = (
                      document.getElementById('new-queue-label') as HTMLInputElement | null
                    )?.value?.trim();
                    const slugRaw = (
                      document.getElementById('new-queue-slug') as HTMLInputElement | null
                    )?.value?.trim();
                    if (!label) {
                      toast.error('Queue label required');
                      return;
                    }
                    const slug =
                      slugRaw ||
                      label
                        .toLowerCase()
                        .replace(/[^a-z0-9_\s-]/g, '')
                        .replace(/[\s-]+/g, '_');
                    void import('@/features/orders/api/order-queue-config-api').then(async (m) => {
                      try {
                        await m.orderQueueConfigApi.upsert({
                          slug,
                          label,
                          description: `${label} queue`,
                          showInNav: true,
                          sidebarOrder: 35,
                        });
                        const queues = await m.orderQueueConfigApi.list();
                        const { setServerOrderQueues } = await import(
                          '@/features/orders/data/order-status-store'
                        );
                        setServerOrderQueues(queues);
                        toast.success('Queue folder added');
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : 'Failed to add queue',
                        );
                      }
                    });
                  }}
                >
                  Add folder
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { BulkActionId, OrderStatusConfig } from '@laam/types';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_GRID_GAP,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { orderStatusConfigApi } from '@/features/orders/api/order-status-config-api';
import {
  DEFAULT_ORDER_BULK_ACTIONS,
  listBulkActionDefinitions,
  resolveConfiguredBulkActions,
} from '@/features/orders/config/bulk-actions-registry';
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
} from '@/features/orders/lib/order-status-visibility';
import { OrderStatusesSortableTable } from '@/features/settings/components/order-statuses-sortable-table';
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
  const { confirm, confirmDialog } = useConfirmDialog();
  const [statuses, setStatuses] = React.useState<OrderStatusConfig[]>(liveStatuses);
  const [draft, setDraft] = React.useState({
    label: '',
    slug: '',
    color: 'hsl(174 58% 42%)',
    showInSidebar: true,
    showInNestedTabs: false,
    showInGroupByStatus: true,
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
      const showInGroupByStatus = draft.showInGroupByStatus;
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
        bulkActions: [...DEFAULT_ORDER_BULK_ACTIONS],
        showInGroupByStatus,
        sidebarOrder: 90 + statuses.length,
      });

      setDraft({
        label: '',
        slug: '',
        color: draft.color,
        showInSidebar: true,
        showInNestedTabs: false,
        showInGroupByStatus: true,
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

  async function reorderStatuses(nextOrdered: OrderStatusConfig[]) {
    setStatuses(nextOrdered);
    setSaving(true);
    try {
      for (const status of nextOrdered) {
        const prev = statuses.find((item) => item.slug === status.slug);
        if (prev && prev.sidebarOrder === status.sidebarOrder) continue;
        await persistStatus(status);
      }
      toast.success('Status order updated — sidebar & nested tabs follow this list');
    } catch (error) {
      setStatuses(getOrderStatuses());
      toast.error(error instanceof Error ? error.message : 'Failed to reorder statuses');
    } finally {
      setSaving(false);
    }
  }

  async function applyFullBulkToAll() {
    const ok = await confirm({
      title: 'Apply full bulk bar to all statuses?',
      description:
        'Every status list will get the same options as All Orders (Change Status, Print, SMS, Pathao/Carrybee, Cancel/Unlink, …). You can still hide items per status afterward.',
      confirmLabel: 'Apply to all',
    });
    if (!ok) return;
    setSaving(true);
    try {
      for (const status of statuses) {
        await persistStatus({
          ...status,
          bulkActions: [...DEFAULT_ORDER_BULK_ACTIONS],
        });
      }
      toast.success('Full bulk actions applied to all statuses');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update statuses');
    } finally {
      setSaving(false);
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
        {confirmDialog}
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
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.showInGroupByStatus}
                  onCheckedChange={(checked) =>
                    setDraft((current) => ({
                      ...current,
                      showInGroupByStatus: checked === true,
                    }))
                  }
                />
                Show in Group by Status
              </label>
              <Button type="button" onClick={() => void handleAdd()} disabled={saving || isLoading}>
                {saving ? 'Saving…' : 'Add status'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader
            className={cn(ORDER_SECTION_HEADER_CLASS, 'flex-row items-center justify-between gap-2')}
          >
            <CardTitle className="text-sm">Configured statuses ({statuses.length})</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={saving || isLoading || statuses.length === 0}
              onClick={() => void applyFullBulkToAll()}
            >
              Apply full bulk bar to all
            </Button>
          </CardHeader>
          <CardContent className={ORDER_SECTION_BODY_CLASS}>
            <OrderStatusesSortableTable
              statuses={statuses}
              disabled={saving || isLoading}
              onReorder={(next) => void reorderStatuses(next)}
              onUpdate={(status, patch) => void updateStatus(status, patch)}
              renderBulkActions={(status) => (
                <StatusBulkActionsEditor
                  status={status}
                  onSave={(bulkActions) => void updateStatus(status, { bulkActions })}
                />
              )}
            />
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p>
                <strong>Drag rows</strong> to set order — sidebar and nested tabs both follow
                this list (same parent group uses relative order).
              </p>
              <p>
                <strong>Parent = None</strong> + sidebar on → own link under Orders.
              </p>
              <p>
                <strong>Parent = queue</strong> + sidebar → nested under that queue.
              </p>
              <p>
                <strong>Nested tab</strong> on → tabs on that parent page.
              </p>
              <p>
                <strong>Bulk actions</strong> → which buttons appear above the order table for that
                status (same modular bar as All Orders). Uncheck to hide on that page only.
              </p>
              <p>
                <strong>Group by</strong> on → card on All Orders “Group by Status” (only if
                count &gt; 0; max 16). Click filters the table — does not open a separate page.
              </p>
              <p>Changes save to the organization database for every user.</p>
            </div>
            <div className="mt-4 space-y-3 rounded-lg border border-border/70 p-3">
              <p className="text-sm font-medium">Queue folders</p>
              <QueueFoldersEditor />
              <div className="rounded-md border border-dashed border-border/70 p-3">
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
                          window.dispatchEvent(new Event('laam-queues-changed'));
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
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function StatusBulkActionsEditor({
  status,
  onSave,
}: {
  status: OrderStatusConfig;
  onSave: (bulkActions: BulkActionId[]) => void;
}) {
  const effective = resolveConfiguredBulkActions(status.bulkActions);
  const [selected, setSelected] = React.useState<Set<BulkActionId>>(
    () => new Set(effective),
  );
  const [open, setOpen] = React.useState(false);
  const definitions = listBulkActionDefinitions();

  React.useEffect(() => {
    if (!open) {
      setSelected(new Set(resolveConfiguredBulkActions(status.bulkActions)));
    }
  }, [open, status.bulkActions]);

  function toggle(id: BulkActionId, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="h-8">
          {effective.length} actions
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <p className="mb-2 text-xs text-muted-foreground">
          Show/hide bulk buttons for <strong>{status.label}</strong> order list.
        </p>
        <div className="custom-scrollbar max-h-64 space-y-1.5 overflow-y-auto">
          {definitions.map((action) => (
            <label key={action.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.has(action.id)}
                onCheckedChange={(checked) => toggle(action.id, checked === true)}
              />
              <span>{action.label}</span>
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setSelected(new Set(DEFAULT_ORDER_BULK_ACTIONS))}
          >
            Full bar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const next = definitions
                .map((d) => d.id)
                .filter((id) => selected.has(id));
              onSave(next.length > 0 ? next : [...DEFAULT_ORDER_BULK_ACTIONS]);
              setOpen(false);
            }}
          >
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function QueueFoldersEditor() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [queues, setQueues] = React.useState<
    Array<{
      id?: string;
      slug: string;
      label: string;
      showInNav: boolean;
      isSystem?: boolean;
      isActive?: boolean;
    }>
  >([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    const { orderQueueConfigApi } = await import('@/features/orders/api/order-queue-config-api');
    const rows = await orderQueueConfigApi.list({ includeInactive: true });
    setQueues(
      rows.map((q) => ({
        id: q.id,
        slug: q.slug,
        label: q.label,
        showInNav: q.showInNav,
        isSystem: q.isSystem,
        isActive: q.isActive,
      })),
    );
    const { setServerOrderQueues } = await import('@/features/orders/data/order-status-store');
    setServerOrderQueues(rows.filter((q) => q.isActive !== false));
  }, []);

  React.useEffect(() => {
    void refresh()
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to load queues');
      })
      .finally(() => setLoading(false));
    const onChange = () => void refresh();
    window.addEventListener('laam-queues-changed', onChange);
    return () => window.removeEventListener('laam-queues-changed', onChange);
  }, [refresh]);

  if (loading) {
    return (
      <>
        <p className="text-xs text-muted-foreground">Loading folders…</p>
        {confirmDialog}
      </>
    );
  }

  return (
    <div className="space-y-2">
      {queues.map((queue) => {
        const inactive = queue.isActive === false;
        return (
          <div
            key={queue.id ?? queue.slug}
            className={cn(
              'flex flex-wrap items-center gap-2 rounded-md border border-border/60 px-2.5 py-2',
              inactive && 'opacity-60',
            )}
          >
            <FormInput
              className="h-8 min-w-[140px] flex-1"
              defaultValue={queue.label}
              disabled={!queue.id || inactive}
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (!queue.id || !next || next === queue.label) return;
                void import('@/features/orders/api/order-queue-config-api').then(async (m) => {
                  try {
                    await m.orderQueueConfigApi.rename(queue.id!, next);
                    toast.success('Folder renamed');
                    window.dispatchEvent(new Event('laam-queues-changed'));
                    await refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Rename failed');
                    e.target.value = queue.label;
                  }
                });
              }}
            />
            <span className="text-[11px] text-muted-foreground">{queue.slug}</span>
            {queue.isSystem ? (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                System
              </span>
            ) : null}
            {inactive ? (
              <span className="text-[10px] uppercase tracking-wide text-amber-700">Hidden</span>
            ) : null}
            <label className="ml-auto flex items-center gap-1.5 text-xs">
              <Checkbox
                checked={queue.showInNav && !inactive}
                disabled={!queue.id || inactive}
                onCheckedChange={(checked) => {
                  if (!queue.id) return;
                  void import('@/features/orders/api/order-queue-config-api').then(async (m) => {
                    try {
                      await m.orderQueueConfigApi.setShowInNav(queue.id!, checked === true);
                      toast.success(checked === true ? 'Shown in nav' : 'Hidden from nav');
                      window.dispatchEvent(new Event('laam-queues-changed'));
                      await refresh();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Update failed');
                    }
                  });
                }}
              />
              Nav
            </label>
            {!queue.isSystem && !inactive && queue.id ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-destructive"
                onClick={() => {
                  void (async () => {
                    const ok = await confirm({
                      title: `Remove folder "${queue.label}"?`,
                      description: 'This folder will be removed from nav.',
                      confirmLabel: 'Remove',
                      destructive: true,
                    });
                    if (!ok) return;
                    const m = await import('@/features/orders/api/order-queue-config-api');
                    try {
                      await m.orderQueueConfigApi.deactivate(queue.id!);
                      toast.success('Folder removed');
                      window.dispatchEvent(new Event('laam-queues-changed'));
                      await refresh();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Delete failed');
                    }
                  })();
                }}
              >
                Delete
              </Button>
            ) : null}
          </div>
        );
      })}
      {confirmDialog}
    </div>
  );
}


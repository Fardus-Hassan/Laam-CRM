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
import {
  appendOrderStatus,
  getOrderStatuses,
  ORDER_STATUSES_CHANGED,
  upsertOrderStatusOverride,
} from '@/features/orders/data/order-status-store';
import { ensureOrderStatusOnApi, syncLocalStatusesToApi } from '@/features/orders/lib/ensure-order-status-api';
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
  const [statuses, setStatuses] = React.useState<OrderStatusConfig[]>(() => getOrderStatuses());
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
    function refresh() {
      setStatuses(getOrderStatuses());
    }
    window.addEventListener(ORDER_STATUSES_CHANGED, refresh);
    return () => window.removeEventListener(ORDER_STATUSES_CHANGED, refresh);
  }, []);

  React.useEffect(() => {
    if (!useApi) return;
    let cancelled = false;
    void syncLocalStatusesToApi(
      getOrderStatuses().map((status) => ({ slug: status.slug, label: status.label })),
    ).then((result) => {
      if (cancelled || result.failed === 0) return;
      toast.warning(`${result.failed} status(es) could not sync to API`);
    });
    return () => {
      cancelled = true;
    };
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

  async function syncStatusToApiFormOptions(slug: string, label: string) {
    if (!useApi) return;
    try {
      await ensureOrderStatusOnApi({ value: slug, label });
    } catch (error) {
      toast.warning(
        error instanceof Error
          ? `Nav saved locally, but API status sync failed: ${error.message}`
          : 'Nav saved locally, but API status sync failed',
      );
    }
  }

  async function handleAdd() {
    const label = draft.label.trim();
    let slug = draft.slug.trim() ? slugify(draft.slug) : slugify(label);
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
      appendOrderStatus({
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

      await syncStatusToApiFormOptions(slug, label);

      setStatuses(getOrderStatuses());
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
          ? 'Status added — check Orders sidebar'
          : 'Status added — enable “Show in sidebar” to appear in nav',
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(status: OrderStatusConfig, patch: Partial<OrderStatusConfig>) {
    const nextParent = patch.parentSlug !== undefined ? patch.parentSlug || undefined : status.parentSlug;
    if (wouldCreateParentCycle(statuses, status.slug, nextParent)) {
      toast.error('That parent would create a cycle');
      return;
    }

    const nextShowSidebar =
      patch.showInSidebar !== undefined ? patch.showInSidebar : statusShowsInSidebar(status);
    const nextShowTabs =
      patch.showInNestedTabs !== undefined
        ? patch.showInNestedTabs
        : statusShowsInNestedTabs(status);

    const next: OrderStatusConfig = {
      ...status,
      ...patch,
      parentSlug: nextParent,
      showInSidebar: nextShowSidebar,
      showInNestedTabs: nextShowTabs,
      displayMode: resolveDisplayModeFromFlags(nextShowSidebar, nextShowTabs),
    };

    upsertOrderStatusOverride(next);
    setStatuses(getOrderStatuses());
    if (patch.label) {
      await syncStatusToApiFormOptions(next.slug, next.label);
    }
    toast.success(`${next.label} updated`);
  }

  return (
    <PageShell
      title="Order Statuses"
      description="Define statuses, where they appear in the Orders nav, and optional parent nesting."
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
                onChange={(event) => {
                  const label = event.target.value;
                  setDraft((current) => ({
                    ...current,
                    label,
                    slug: current.slug ? current.slug : slugify(label),
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
              <Button type="button" onClick={() => void handleAdd()} disabled={saving}>
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
                              void updateStatus(status, { parentSlug: parentSlug || undefined })
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
                <strong>Parent = None</strong> → appears under Orders as its own sidebar link (if
                sidebar is on).
              </p>
              <p>
                <strong>Parent = queue</strong> (e.g. Call confirm) → nests under that queue folder.
              </p>
              <p>
                <strong>Parent = another status</strong> → nests under that status in the sidebar.
              </p>
              <p>
                Pending / Pending 2 / Pending 3 show under Call confirm because their parent is set
                to that queue — clear parent to move them out. New statuses default to sidebar on,
                parent none.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { CustomerCompareOp, OrgCustomerPurchaseSegment } from '@laam/types';
import {
  purchaseSegmentShowsInNestedTabs,
  purchaseSegmentShowsInSidebar,
} from '@laam/types';

import { FormField } from '@/components/form/form-field';
import { Can } from '@/components/auth/can';
import { FormInput } from '@/components/form/form-input';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_GRID_GAP,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { resolveDisplayModeFromFlags } from '@/features/orders/lib/order-status-hierarchy';
import { orgCustomerPurchaseSegmentsApi } from '@/features/settings/api/org-customer-purchase-segments-api';
import { setServerPurchaseSegments } from '@/features/customers/data/purchase-segments-store';
import { cn } from '@/lib/utils';

const OP_OPTIONS: { value: CustomerCompareOp; label: string }[] = [
  { value: 'eq', label: 'Exact count (=)' },
  { value: 'gt', label: 'More than (>) — Loyal style' },
  { value: 'gte', label: 'At least (≥)' },
  { value: 'lt', label: 'Less than (<)' },
  { value: 'lte', label: 'At most (≤)' },
];

type Draft = {
  label: string;
  slug: string;
  op: CustomerCompareOp;
  threshold: string;
  showInSidebar: boolean;
  showInNestedTabs: boolean;
};

const EMPTY_DRAFT: Draft = {
  label: '',
  slug: '',
  op: 'eq',
  threshold: '1',
  showInSidebar: true,
  showInNestedTabs: true,
};

export function CustomerPurchaseSegmentsSettingsPage() {
  const [segments, setSegments] = React.useState<OrgCustomerPurchaseSegment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = React.useState(false);
  const [deleteTarget, setDeleteTarget] =
    React.useState<OrgCustomerPurchaseSegment | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await orgCustomerPurchaseSegmentsApi.list();
      setSegments(list);
      setServerPurchaseSegments(list);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  function resetDraft() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  function startEdit(row: OrgCustomerPurchaseSegment) {
    setEditingId(row.id);
    setDraft({
      label: row.label,
      slug: row.slug,
      op: row.op,
      threshold: String(row.threshold),
      showInSidebar: purchaseSegmentShowsInSidebar(row),
      showInNestedTabs: purchaseSegmentShowsInNestedTabs(row),
    });
  }

  async function handleSave() {
    if (!draft.label.trim()) {
      toast.error('Label is required');
      return;
    }
    const threshold = Number(draft.threshold);
    if (!Number.isFinite(threshold) || threshold < 0) {
      toast.error('Threshold must be 0 or more');
      return;
    }
    const displayMode = resolveDisplayModeFromFlags(
      draft.showInSidebar,
      draft.showInNestedTabs,
    );
    setBusy(true);
    try {
      await orgCustomerPurchaseSegmentsApi.upsert({
        id: editingId ?? undefined,
        label: draft.label.trim(),
        slug: draft.slug.trim() || undefined,
        op: draft.op,
        threshold,
        metric: 'deliveredCount',
        displayMode,
        sortOrder: editingId
          ? segments.find((s) => s.id === editingId)?.sortOrder ?? segments.length
          : segments.length * 10 + 10,
        showInNav: draft.showInSidebar,
        isActive: true,
      });
      toast.success(editingId ? 'Segment updated' : 'Segment created');
      resetDraft();
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function updateVisibility(
    row: OrgCustomerPurchaseSegment,
    patch: { showInSidebar?: boolean; showInNestedTabs?: boolean },
  ) {
    const showInSidebar =
      patch.showInSidebar ?? purchaseSegmentShowsInSidebar(row);
    const showInNestedTabs =
      patch.showInNestedTabs ?? purchaseSegmentShowsInNestedTabs(row);
    const displayMode = resolveDisplayModeFromFlags(showInSidebar, showInNestedTabs);
    try {
      await orgCustomerPurchaseSegmentsApi.upsert({
        id: row.id,
        label: row.label,
        slug: row.slug,
        op: row.op,
        threshold: row.threshold,
        metric: row.metric,
        displayMode,
        sortOrder: row.sortOrder,
        showInNav: showInSidebar,
        isActive: row.isActive,
      });
      toast.success(`${row.label} visibility updated`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    }
  }

  return (
    <PageShell
      title="Purchase segments"
      description="Nx Buyers and Loyal rules — same sidebar / nested tabs visibility as order statuses."
    >
      <div className={cn(ORDER_SECTION_GRID_GAP, 'max-w-3xl')}>
        <p className="text-sm text-muted-foreground">
          Exact count (=) for 1x / 10x Buyers. Use “More than” for Loyal (e.g. threshold 4 →
          5+ deliveries). Count uses delivered / completed / partial delivered orders. Brand
          sidebar layout only nests or hides these; visibility mode is set here.
        </p>

        <Card>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-base">
              {editingId ? 'Edit segment' : 'New segment'}
            </CardTitle>
          </CardHeader>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
            <FormField label="Label" htmlFor="ps-label" required>
              <FormInput
                id="ps-label"
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="10x Buyers"
              />
            </FormField>
            <FormField label="Slug (optional)" htmlFor="ps-slug">
              <FormInput
                id="ps-slug"
                value={draft.slug}
                onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                placeholder="10x"
                disabled={Boolean(
                  editingId && segments.find((s) => s.id === editingId)?.isSystem,
                )}
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Rule" htmlFor="ps-op">
                <select
                  id="ps-op"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.op}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      op: e.target.value as CustomerCompareOp,
                    }))
                  }
                >
                  {OP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Order count" htmlFor="ps-threshold" required>
                <FormInput
                  id="ps-threshold"
                  type="number"
                  min={0}
                  value={draft.threshold}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, threshold: e.target.value }))
                  }
                />
              </FormField>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.showInSidebar}
                  onCheckedChange={(checked) =>
                    setDraft((d) => ({ ...d, showInSidebar: checked === true }))
                  }
                />
                Show in sidebar
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.showInNestedTabs}
                  onCheckedChange={(checked) =>
                    setDraft((d) => ({
                      ...d,
                      showInNestedTabs: checked === true,
                    }))
                  }
                />
                Show as nested tabs
              </label>
            </div>
            <div className="flex gap-2">
              <Can permission="settings.manage">
                <Button type="button" onClick={() => void handleSave()} disabled={busy}>
                  <Plus className="size-3.5" />
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </Can>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetDraft}>
                  Cancel
                </Button>
              ) : null}
              <Button type="button" variant="ghost" asChild>
                <Link href="/dashboard/customers">Back to customers</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-base">Segments</CardTitle>
          </CardHeader>
          <CardContent className={ORDER_SECTION_BODY_CLASS}>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <ul className="divide-y divide-border">
                {segments.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{row.label}</span>
                        <Badge variant="secondary">{row.slug}</Badge>
                        {row.isSystem ? <Badge variant="outline">System</Badge> : null}
                        {!row.isActive ? (
                          <Badge variant="destructive">Hidden</Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {row.metric} {row.op} {row.threshold} · {row.displayMode}
                      </p>
                      <div className="flex flex-wrap gap-4 pt-1">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Checkbox
                            checked={purchaseSegmentShowsInSidebar(row)}
                            onCheckedChange={(checked) =>
                              void updateVisibility(row, {
                                showInSidebar: checked === true,
                              })
                            }
                            disabled={!row.isActive}
                          />
                          Sidebar
                        </label>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Checkbox
                            checked={purchaseSegmentShowsInNestedTabs(row)}
                            onCheckedChange={(checked) =>
                              void updateVisibility(row, {
                                showInNestedTabs: checked === true,
                              })
                            }
                            disabled={!row.isActive}
                          />
                          Nested tabs
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Can permission="settings.manage">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(row)}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            void orgCustomerPurchaseSegmentsApi
                              .setActive(row.id, !row.isActive)
                              .then(refresh)
                          }
                        >
                          {row.isActive ? 'Hide' : 'Show'}
                        </Button>
                        {!row.isSystem ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setDeleteTarget(row)}
                          >
                            Delete
                          </Button>
                        ) : null}
                      </Can>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete purchase segment?"
        description={
          deleteTarget
            ? `"${deleteTarget.label}" will be removed from sidebar and filters.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return;
          await orgCustomerPurchaseSegmentsApi.remove(deleteTarget.id);
          toast.success('Segment deleted');
          setDeleteTarget(null);
          await refresh();
        }}
      />
    </PageShell>
  );
}

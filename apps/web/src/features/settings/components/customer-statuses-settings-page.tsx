'use client';

import * as React from 'react';
import Link from 'next/link';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { OrgCustomerStatus } from '@laam/types';

import { FormField } from '@/components/form/form-field';
import { Can } from '@/components/auth/can';
import { FormInput } from '@/components/form/form-input';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_GRID_GAP,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { orgCustomerStatusesApi } from '@/features/settings/api/org-customer-statuses-api';
import { cn } from '@/lib/utils';

export function CustomerStatusesSettingsPage() {
  const [statuses, setStatuses] = React.useState<OrgCustomerStatus[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState({ label: '', slug: '', color: '' });
  const [busy, setBusy] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<OrgCustomerStatus | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setStatuses(await orgCustomerStatusesApi.list());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load statuses');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  function resetDraft() {
    setEditingId(null);
    setDraft({ label: '', slug: '', color: '' });
  }

  function startEdit(row: OrgCustomerStatus) {
    setEditingId(row.id);
    setDraft({ label: row.label, slug: row.slug, color: row.color ?? '' });
  }

  async function handleSave() {
    if (!draft.label.trim()) {
      toast.error('Label is required');
      return;
    }
    setBusy(true);
    try {
      await orgCustomerStatusesApi.upsert({
        id: editingId ?? undefined,
        label: draft.label.trim(),
        slug: draft.slug.trim() || undefined,
        color: draft.color.trim() || undefined,
        sortOrder: editingId
          ? statuses.find((s) => s.id === editingId)?.sortOrder ?? statuses.length
          : statuses.length,
        isActive: true,
      });
      toast.success(editingId ? 'Status updated' : 'Status created');
      resetDraft();
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      title="Customer statuses"
      description="Admin-defined pills for the Customers list (Premium, SMS Hub, campaign tags, etc.)."
    >
      <div className="mb-3 text-sm">
        <Link href="/dashboard/customers" className="text-primary hover:underline">
          ← Back to customers
        </Link>
      </div>

      <div className={cn(ORDER_SECTION_GRID_GAP, 'grid gap-4 lg:grid-cols-2')}>
        <Card>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-base">{editingId ? 'Edit status' : 'Add status'}</CardTitle>
          </CardHeader>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
            <FormField label="Label">
              <FormInput
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="e.g. Premium customer"
              />
            </FormField>
            <FormField label="Slug (optional)">
              <FormInput
                value={draft.slug}
                onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                placeholder="premium_customer"
                disabled={Boolean(editingId && statuses.find((s) => s.id === editingId)?.isSystem)}
              />
            </FormField>
            <FormField label="Color (optional)">
              <FormInput
                value={draft.color}
                onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
                placeholder="#0d9488"
              />
            </FormField>
            <div className="flex gap-2">
              <Can permission={['settings.manage', 'companies.edit']}>
                <Button type="button" disabled={busy} onClick={() => void handleSave()}>
                  <Plus className="size-4" />
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </Can>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetDraft}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-base">Statuses</CardTitle>
          </CardHeader>
          <CardContent className={ORDER_SECTION_BODY_CLASS}>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : statuses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No statuses yet.</p>
            ) : (
              <ul className="space-y-2">
                {statuses.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.slug}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {row.isSystem ? <Badge variant="secondary">System</Badge> : null}
                      {!row.isActive ? <Badge variant="outline">Inactive</Badge> : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(row)}
                      >
                        <Pencil className="size-3.5" />
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
        title="Delete status?"
        description={`Remove “${deleteTarget?.label ?? ''}”? Customers keep the old slug until reassigned.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return;
          await orgCustomerStatusesApi.remove(deleteTarget.id);
          toast.success('Status deleted');
          setDeleteTarget(null);
          await refresh();
        }}
      />
    </PageShell>
  );
}

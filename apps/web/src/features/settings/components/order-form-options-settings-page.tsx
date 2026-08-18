'use client';

import * as React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { FormTextarea } from '@/components/form/form-textarea';
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
import { orderFormOptionsApi, type OrderFormOptionRow } from '@/features/orders/api/order-form-options-api';
import { ordersApi } from '@/features/orders/api/orders-api';
import { cn } from '@/lib/utils';

const TABS = [
  { kind: 'district', label: 'District' },
  { kind: 'source', label: 'Order Source' },
  { kind: 'order_tag', label: 'Order Tag' },
  { kind: 'payment_method', label: 'Payment Method' },
  { kind: 'status', label: 'Order Status' },
  { kind: 'default_courier_note', label: 'Courier Note' },
] as const;

type TabKind = (typeof TABS)[number]['kind'];

export function OrderFormOptionsSettingsPage() {
  const [activeKind, setActiveKind] = React.useState<TabKind>('district');
  const [rows, setRows] = React.useState<OrderFormOptionRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState({ value: '', label: '' });
  const [courierNote, setCourierNote] = React.useState('');
  const [courierNoteId, setCourierNoteId] = React.useState<string | null>(null);
  const [customerCreateSource, setCustomerCreateSource] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<OrderFormOptionRow | null>(null);

  const isCourierNote = activeKind === 'default_courier_note';

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await orderFormOptionsApi.list(activeKind);
      setRows(data);
      if (activeKind === 'default_courier_note') {
        const note = data[0];
        setCourierNote(note?.label ?? '');
        setCourierNoteId(note?.id ?? null);
      }
      if (activeKind === 'source') {
        const options = await ordersApi.getFormOptions();
        setCustomerCreateSource(options.customerCreateSource ?? '');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load options');
    } finally {
      setLoading(false);
    }
  }, [activeKind]);

  React.useEffect(() => {
    setEditingId(null);
    setDraft({ value: '', label: '' });
    void load();
  }, [load]);

  function startEdit(row: OrderFormOptionRow) {
    setEditingId(row.id);
    setDraft({ value: row.value, label: row.label });
  }

  function resetDraft() {
    setEditingId(null);
    setDraft({ value: '', label: '' });
  }

  async function handleSave() {
    if (!draft.label.trim()) {
      toast.error('Label is required');
      return;
    }
    const value = (draft.value.trim() || draft.label).replace(/\s+/g, '_').toLowerCase();
    setBusy(true);
    try {
      if (editingId) {
        await orderFormOptionsApi.update(editingId, { label: draft.label.trim(), value });
        toast.success('Updated');
      } else {
        await orderFormOptionsApi.create({
          kind: activeKind,
          value,
          label: draft.label.trim(),
        });
        toast.success('Added');
      }
      resetDraft();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveCustomerCreateSource(next: string) {
    setBusy(true);
    try {
      const saved = await ordersApi.setCustomerCreateSource(next);
      setCustomerCreateSource(saved.customerCreateSource);
      toast.success(
        saved.customerCreateSource
          ? 'Customer Create Order source saved'
          : 'Customer Create Order will not auto-set source',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveCourierNote() {
    if (!courierNoteId) {
      toast.error('Courier note row missing');
      return;
    }
    setBusy(true);
    try {
      await orderFormOptionsApi.update(courierNoteId, { label: courierNote });
      toast.success('Courier note saved');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await orderFormOptionsApi.remove(deleteTarget.id);
      toast.success('Deleted');
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: OrderFormOptionRow) {
    setBusy(true);
    try {
      await orderFormOptionsApi.update(row.id, { isActive: !row.isActive });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      title="Order form options"
      description="Manage District, Source, Tags, Payment, Status, and default Courier Note used on Create Order. Order Source also controls the default when creating an order from a customer."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <Button
              key={tab.kind}
              type="button"
              size="sm"
              variant={activeKind === tab.kind ? 'default' : 'outline'}
              onClick={() => setActiveKind(tab.kind)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {isCourierNote ? (
          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Default courier note</CardTitle>
            </CardHeader>
            <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
              <FormField label="Note text">
                <FormTextarea
                  rows={5}
                  value={courierNote}
                  onChange={(e) => setCourierNote(e.target.value)}
                />
              </FormField>
              <Can permission={['settings.manage', 'orders.create']}>
                <Button type="button" size="sm" disabled={busy || loading} onClick={() => void handleSaveCourierNote()}>
                  Save courier note
                </Button>
              </Can>
            </CardContent>
          </Card>
        ) : (
          <>
            {activeKind === 'source' ? (
              <Card className="gap-0 py-0 shadow-none">
                <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                  <CardTitle className="text-sm">Customer → Create Order</CardTitle>
                </CardHeader>
                <CardContent className={cn('space-y-2', ORDER_SECTION_BODY_CLASS)}>
                  <p className="text-xs text-muted-foreground">
                    Used when staff click Order on the customer list or create an order from
                    customer details. Staff can still change it on the form.
                  </p>
                  <FormField label="Default order source" hint="Leave as “Ask on form” to keep current behavior.">
                    <FormSelect
                      searchable={false}
                      disabled={busy || loading}
                      value={customerCreateSource}
                      onChange={(next) => void handleSaveCustomerCreateSource(next)}
                      options={[
                        { value: '', label: 'Ask on form (or last order source)' },
                        ...rows
                          .filter((row) => row.isActive)
                          .map((row) => ({ value: row.value, label: row.label })),
                      ]}
                      placeholder="Select source"
                    />
                  </FormField>
                </CardContent>
              </Card>
            ) : null}
            <Card className="gap-0 py-0 shadow-none">
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">{editingId ? 'Edit option' : 'Add option'}</CardTitle>
              </CardHeader>
              <CardContent
                className={cn(
                  'grid sm:grid-cols-2 lg:grid-cols-3',
                  ORDER_SECTION_BODY_CLASS,
                  ORDER_SECTION_GRID_GAP,
                )}
              >
                <FormField label="Label" required>
                  <FormInput
                    value={draft.label}
                    onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                    placeholder="Display label"
                  />
                </FormField>
                <FormField label="Value (slug)">
                  <FormInput
                    value={draft.value}
                    onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
                    placeholder="auto from label if empty"
                  />
                </FormField>
                <div className="flex items-end gap-2">
                  <Can permission={['settings.manage', 'orders.create']}>
                    <Button type="button" size="sm" disabled={busy} onClick={() => void handleSave()}>
                      <Plus className="size-3.5" />
                      {editingId ? 'Update' : 'Add'}
                    </Button>
                    {editingId ? (
                      <Button type="button" size="sm" variant="ghost" onClick={resetDraft}>
                        Cancel
                      </Button>
                    ) : null}
                  </Can>
                </div>
              </CardContent>
            </Card>

            <Card className="gap-0 py-0 shadow-none">
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">
                  {TABS.find((t) => t.kind === activeKind)?.label} list
                </CardTitle>
              </CardHeader>
              <CardContent className={cn(ORDER_SECTION_BODY_CLASS)}>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No options yet.</p>
                ) : (
                  <div className="divide-y rounded-md border">
                    {rows.map((row) => (
                      <div
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{row.label}</p>
                          <p className="font-mono text-xs text-muted-foreground">{row.value}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={row.isActive ? 'default' : 'secondary'}>
                            {row.isActive ? 'Active' : 'Hidden'}
                          </Badge>
                          <Can permission={['settings.manage', 'orders.create']}>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => void toggleActive(row)}
                            >
                              {row.isActive ? 'Hide' : 'Show'}
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => startEdit(row)}>
                              <Pencil className="size-3.5" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteTarget(row)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </Can>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete option?"
        description={
          deleteTarget
            ? `Remove “${deleteTarget.label}” from Create Order dropdowns?`
            : 'Remove this option from Create Order dropdowns?'
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
      />
    </PageShell>
  );
}

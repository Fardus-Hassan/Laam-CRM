'use client';

import * as React from 'react';
import type { Coupon, CreateCouponPayload } from '@laam/types';
import { Plus, Tag } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { couponsApi } from '@/features/coupons/api/coupons-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { downloadCsv } from '@/lib/export-csv';

const EMPTY_DRAFT: CreateCouponPayload = {
  code: '',
  type: 'percent',
  value: 10,
  description: '',
};

function toDateInput(value?: string) {
  if (!value) return '';
  return value.slice(0, 10);
}

export function CouponsPage() {
  const [coupons, setCoupons] = React.useState<Coupon[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Coupon | null>(null);
  const [draft, setDraft] = React.useState<CreateCouponPayload>(EMPTY_DRAFT);
  const [busy, setBusy] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Coupon | null>(null);

  const refresh = React.useCallback(async () => {
    setCoupons(await couponsApi.list());
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  function openCreate() {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setOpen(true);
  }

  function openEdit(coupon: Coupon) {
    setEditing(coupon);
    setDraft({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minOrderBdt: coupon.minOrderBdt,
      maxDiscountBdt: coupon.maxDiscountBdt,
      usageLimit: coupon.usageLimit,
      expiresAt: toDateInput(coupon.expiresAt),
      description: coupon.description ?? '',
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!draft.code.trim()) return;
    setBusy(true);
    try {
      if (editing) {
        await couponsApi.update(editing.id, {
          ...draft,
          minOrderBdt: draft.minOrderBdt ?? null,
          maxDiscountBdt: draft.maxDiscountBdt ?? null,
          usageLimit: draft.usageLimit ?? null,
          expiresAt: draft.expiresAt || null,
          description: draft.description || null,
        });
        toast.success('Coupon updated');
      } else {
        await couponsApi.create(draft);
        toast.success('Coupon created');
      }
      setOpen(false);
      setEditing(null);
      setDraft(EMPTY_DRAFT);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(id: string) {
    try {
      await couponsApi.toggle(id);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Toggle failed');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await couponsApi.remove(deleteTarget.id);
      toast.success(`Deleted ${deleteTarget.code}`);
      setDeleteTarget(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  function handleExport() {
    downloadCsv(
      'coupons.csv',
      ['Code', 'Type', 'Value', 'Usage', 'Active', 'Expires'],
      coupons.map((c) => [
        c.code,
        c.type,
        c.value,
        `${c.usageCount}${c.usageLimit ? `/${c.usageLimit}` : ''}`,
        c.isActive ? 'yes' : 'no',
        c.expiresAt ?? '',
      ]),
    );
  }

  const activeCount = coupons.filter((c) => c.isActive).length;
  const totalRedemptions = coupons.reduce((s, c) => s + c.usageCount, 0);

  return (
    <PageShell
      title="Coupons"
      description="Promo codes for create-order — percent or fixed discounts."
    >
      <div className={ORDER_PAGE_GAP}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Tag className="size-4" />
              {activeCount} active
            </span>
            <span>{totalRedemptions} redemptions</span>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={handleExport}>
              Export CSV
            </Button>
            <Can permission="coupons.manage">
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus className="size-4" />
                New coupon
              </Button>
            </Can>
          </div>
        </div>

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">All coupons</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Min order</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-medium">{c.code}</TableCell>
                    <TableCell>
                      {c.type === 'percent' ? `${c.value}%` : formatCurrency(c.value)}
                      {c.maxDiscountBdt ? ` (max ${formatCurrency(c.maxDiscountBdt)})` : ''}
                    </TableCell>
                    <TableCell>
                      {c.minOrderBdt ? formatCurrency(c.minOrderBdt) : '—'}
                    </TableCell>
                    <TableCell>
                      {c.usageCount}
                      {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                    </TableCell>
                    <TableCell>{c.expiresAt ? toDateInput(c.expiresAt) : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? 'success' : 'secondary'}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Can permission="coupons.manage">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(c)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleToggle(c.id)}
                          >
                            {c.isActive ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setDeleteTarget(c)}
                          >
                            Delete
                          </Button>
                        </div>
                      </Can>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setEditing(null);
            setDraft(EMPTY_DRAFT);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit coupon' : 'Create coupon'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label="Code">
              <FormInput
                value={draft.code}
                onChange={(e) =>
                  setDraft({ ...draft, code: e.target.value.toUpperCase() })
                }
                placeholder="RAMADAN10"
              />
            </FormField>
            <FormField label="Type">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={draft.type}
                onChange={(e) =>
                  setDraft({ ...draft, type: e.target.value as 'percent' | 'fixed' })
                }
              >
                <option value="percent">Percent</option>
                <option value="fixed">Fixed (BDT)</option>
              </select>
            </FormField>
            <FormField label="Value">
              <FormInput
                type="number"
                value={draft.value}
                onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })}
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Min order (৳, optional)">
                <FormInput
                  type="number"
                  min={0}
                  value={draft.minOrderBdt ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      minOrderBdt: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g. 800"
                />
              </FormField>
              <FormField label="Max discount (৳, optional)">
                <FormInput
                  type="number"
                  min={0}
                  value={draft.maxDiscountBdt ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      maxDiscountBdt: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g. 500"
                />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Usage limit (optional)">
                <FormInput
                  type="number"
                  min={1}
                  value={draft.usageLimit ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      usageLimit: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g. 200"
                />
              </FormField>
              <FormField label="Expires (optional)">
                <FormInput
                  type="date"
                  value={draft.expiresAt ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      expiresAt: e.target.value || undefined,
                    })
                  }
                />
              </FormField>
            </div>
            <FormField label="Description">
              <FormInput
                value={draft.description ?? ''}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!draft.code || busy}
              onClick={() => void handleSave()}
            >
              {editing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete coupon?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-mono font-medium">{deleteTarget?.code}</span>? This
            cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void handleDelete()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

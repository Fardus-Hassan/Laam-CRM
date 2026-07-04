'use client';

import * as React from 'react';
import type { Coupon, CreateCouponPayload } from '@laam/types';
import { Plus, Tag } from 'lucide-react';

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

export function CouponsPage() {
  const [coupons, setCoupons] = React.useState<Coupon[]>([]);
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<CreateCouponPayload>({
    code: '',
    type: 'percent',
    value: 10,
    description: '',
  });

  const refresh = React.useCallback(async () => {
    setCoupons(await couponsApi.list());
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate() {
    await couponsApi.create(draft);
    setOpen(false);
    setDraft({ code: '', type: 'percent', value: 10, description: '' });
    await refresh();
  }

  async function handleToggle(id: string) {
    await couponsApi.toggle(id);
    await refresh();
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
            <span className="flex items-center gap-1"><Tag className="size-4" />{activeCount} active</span>
            <span>{totalRedemptions} redemptions</span>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={handleExport}>Export CSV</Button>
            <Can permission="coupons.manage">
              <Button type="button" size="sm" onClick={() => setOpen(true)}>
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
                    <TableCell>{c.minOrderBdt ? formatCurrency(c.minOrderBdt) : '—'}</TableCell>
                    <TableCell>
                      {c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}
                    </TableCell>
                    <TableCell>{c.expiresAt ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? 'success' : 'secondary'}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Can permission="coupons.manage">
                        <Button type="button" size="sm" variant="ghost" onClick={() => void handleToggle(c.id)}>
                          {c.isActive ? 'Disable' : 'Enable'}
                        </Button>
                      </Can>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label="Code">
              <FormInput value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="RAMADAN10" />
            </FormField>
            <FormField label="Type">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as 'percent' | 'fixed' })}
              >
                <option value="percent">Percent</option>
                <option value="fixed">Fixed (BDT)</option>
              </select>
            </FormField>
            <FormField label="Value">
              <FormInput type="number" value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} />
            </FormField>
            <FormField label="Min order (optional)">
              <FormInput type="number" value={draft.minOrderBdt ?? ''} onChange={(e) => setDraft({ ...draft, minOrderBdt: e.target.value ? Number(e.target.value) : undefined })} />
            </FormField>
            <FormField label="Description">
              <FormInput value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={!draft.code}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

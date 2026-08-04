'use client';

import * as React from 'react';
import type { UnitOfMeasure, UomDimension } from '@laam/types';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { InventoryResponsiveList } from '@/features/inventory/components/inventory-responsive-list';
import { InventorySubNav } from '@/features/inventory/components/inventory-sub-nav';
import { ORDER_PAGE_GAP } from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

const DIMENSION_OPTIONS: { value: UomDimension; label: string }[] = [
  { value: 'count', label: 'Count' },
  { value: 'mass', label: 'Mass' },
  { value: 'volume', label: 'Volume' },
  { value: 'length', label: 'Length' },
  { value: 'area', label: 'Area' },
  { value: 'other', label: 'Other' },
];

export function UnitsPage() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [units, setUnits] = React.useState<UnitOfMeasure[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UnitOfMeasure | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [name, setName] = React.useState('');
  const [dimension, setDimension] = React.useState<UomDimension>('count');
  const [factor, setFactor] = React.useState('1');

  const load = React.useCallback(() => {
    setLoading(true);
    void inventoryApi
      .listUnits()
      .then((res) => setUnits(res.items))
      .catch((error) => {
        setUnits([]);
        toast.error(error instanceof Error ? error.message : 'Could not load units');
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setCode('');
    setName('');
    setDimension('count');
    setFactor('1');
    setDialogOpen(true);
  }

  function openEdit(unit: UnitOfMeasure) {
    setEditing(unit);
    setCode(unit.code);
    setName(unit.name);
    setDimension(unit.dimension);
    setFactor(String(unit.factorToDimensionBase));
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!code.trim() || !name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    const factorNum = Number(factor);
    if (!Number.isFinite(factorNum) || factorNum <= 0) {
      toast.error('Factor must be a positive number');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await inventoryApi.updateUnit(editing.id, {
          code: editing.isSystem ? undefined : code.trim(),
          name: name.trim(),
          dimension: editing.isSystem ? undefined : dimension,
          factorToDimensionBase: factorNum,
        });
        toast.success('Unit updated');
      } else {
        await inventoryApi.createUnit({
          code: code.trim(),
          name: name.trim(),
          dimension,
          factorToDimensionBase: factorNum,
        });
        toast.success('Unit created');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save unit');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(unit: UnitOfMeasure) {
    if (unit.isSystem) return;
    const ok = await confirm({
      title: `Delete unit ${unit.code}?`,
      description: 'This custom unit will be permanently removed.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await inventoryApi.deleteUnit(unit.id);
      toast.success('Unit deleted');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete unit');
    }
  }

  return (
    <PageShell title="Inventory" description="Custom units of measure for purchasing and production.">
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <InventorySubNav />
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">Units of measure</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              System units are built-in. Add custom codes for your catalog (e.g. sack, tray).
            </p>
          </div>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add unit
          </Button>
        </div>

        <InventoryResponsiveList
          loading={loading}
          emptyTitle="No units"
          emptyDescription="Default units load automatically for each organization."
          headers={['Code', 'Name', 'Dimension', 'Factor', 'Type', 'Actions']}
          rows={units.map((unit) => ({
            id: unit.id,
            cells: [
              <span key="c" className="font-mono font-medium">
                {unit.code}
              </span>,
              <span key="n">{unit.name}</span>,
              <span key="d" className="capitalize text-muted-foreground">
                {unit.dimension}
              </span>,
              <span key="f" className="tabular-nums">
                {unit.factorToDimensionBase}
              </span>,
              <Badge key="t" variant={unit.isSystem ? 'secondary' : 'default'}>
                {unit.isSystem ? 'System' : 'Custom'}
              </Badge>,
              <div key="a" className="flex flex-wrap gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(unit)}>
                  Edit
                </Button>
                {!unit.isSystem ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleDelete(unit)}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>,
            ],
          }))}
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit unit' : 'Add unit'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Code">
                <FormInput
                  value={code}
                  disabled={editing?.isSystem}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. sack"
                />
              </FormField>
              <FormField label="Name">
                <FormInput value={name} onChange={(e) => setName(e.target.value)} />
              </FormField>
              <FormField label="Dimension">
                <FormSearchSelect
                  value={dimension}
                  onChange={(v) => setDimension(v as UomDimension)}
                  options={DIMENSION_OPTIONS}
                  searchable={false}
                  disabled={editing?.isSystem}
                />
              </FormField>
              <FormField label="Factor to dimension base">
                <FormInput
                  type="number"
                  min={0.000001}
                  step="any"
                  value={factor}
                  onChange={(e) => setFactor(e.target.value)}
                />
              </FormField>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                {saving ? 'Saving…' : editing ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {confirmDialog}
    </PageShell>
  );
}

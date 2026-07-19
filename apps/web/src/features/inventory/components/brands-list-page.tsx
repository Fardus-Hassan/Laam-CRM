'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ProductBrand } from '@laam/types';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { Can } from '@/components/auth/can';
import { FormInput } from '@/components/form/form-input';
import { FormTextarea } from '@/components/form/form-textarea';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InventorySubNav } from '@/features/inventory/components/inventory-sub-nav';
import { productBrandsApi } from '@/features/settings/api/product-brands-api';

export function BrandsListPage() {
  const [brands, setBrands] = React.useState<ProductBrand[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ProductBrand | null>(null);
  const [draft, setDraft] = React.useState({
    name: '',
    slug: '',
    description: '',
    isActive: true,
  });

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBrands(await productBrandsApi.list());
    } catch (cause) {
      setBrands([]);
      setError(cause instanceof Error ? cause.message : 'Could not load brands');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  function resetDraft() {
    setEditingId(null);
    setDraft({ name: '', slug: '', description: '', isActive: true });
  }

  function startEdit(brand: ProductBrand) {
    setEditingId(brand.id);
    setDraft({
      name: brand.name,
      slug: brand.slug,
      description: brand.description ?? '',
      isActive: brand.isActive,
    });
  }

  async function handleSave() {
    if (!draft.name.trim()) {
      toast.error('Brand name is required');
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        await productBrandsApi.update(editingId, {
          name: draft.name.trim(),
          slug: draft.slug.trim() || undefined,
          description: draft.description.trim() || undefined,
          isActive: draft.isActive,
        });
        toast.success('Brand updated');
      } else {
        await productBrandsApi.create({
          name: draft.name.trim(),
          slug: draft.slug.trim() || undefined,
          description: draft.description.trim() || undefined,
          isActive: draft.isActive,
        });
        toast.success('Brand created');
      }
      resetDraft();
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save brand');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(brand: ProductBrand) {
    setBusy(true);
    try {
      await productBrandsApi.remove(brand.id);
      toast.success('Brand deleted');
      if (editingId === brand.id) resetDraft();
      setDeleteTarget(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete brand');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      title="Product brands"
      description="Manufacturer or label brands for your catalog. Create these before products."
      breadcrumbs={[
        { label: 'Inventory', href: '/dashboard/inventory/products' },
        { label: 'Brands' },
      ]}
    >
      <div className="space-y-4">
        <InventorySubNav />

        <Can permission={['inventory.create', 'inventory.edit']}>
          <div className="rounded-lg border border-border bg-muted/20 p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{editingId ? 'Edit brand' : 'New brand'}</h2>
            {editingId ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetDraft}>
                Cancel edit
              </Button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Name">
              <FormInput
                value={draft.name}
                onChange={(e) => setDraft((c) => ({ ...c, name: e.target.value }))}
                placeholder="Laam Honey"
              />
            </FormField>
            <FormField label="Slug (optional)">
              <FormInput
                value={draft.slug}
                onChange={(e) => setDraft((c) => ({ ...c, slug: e.target.value }))}
                placeholder="auto_from_name"
              />
            </FormField>
            <FormField label="Description" className="sm:col-span-2">
              <FormTextarea
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft((c) => ({ ...c, description: e.target.value }))}
                placeholder="Optional note"
              />
            </FormField>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={draft.isActive}
                onCheckedChange={(value) => setDraft((c) => ({ ...c, isActive: value === true }))}
              />
              Active
            </label>
          </div>
          <Button type="button" size="sm" disabled={busy} onClick={() => void handleSave()}>
            <Plus className="size-4" />
            {editingId ? 'Save brand' : 'Add brand'}
          </Button>
          </div>
        </Can>

        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading brands…</p>
        ) : error ? (
          <p className="py-10 text-center text-sm text-destructive">{error}</p>
        ) : brands.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No brands yet. Add one above, then create{' '}
            <Link href="/dashboard/settings/categories" className="text-primary hover:underline">
              categories
            </Link>{' '}
            and{' '}
            <Link href="/dashboard/inventory/products/new" className="text-primary hover:underline">
              products
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {brands.map((brand) => (
              <li
                key={brand.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{brand.name}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {brand.slug}
                    </Badge>
                    {!brand.isActive ? <Badge variant="destructive">Inactive</Badge> : null}
                  </div>
                  {brand.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{brand.description}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <Can permission={['inventory.create', 'inventory.edit']}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={busy}
                      aria-label={`Edit ${brand.name}`}
                      onClick={() => startEdit(brand)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </Can>
                  <Can permission="inventory.delete">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      disabled={busy}
                      aria-label={`Delete ${brand.name}`}
                      onClick={() => setDeleteTarget(brand)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </Can>
                </div>
              </li>
            ))}
          </ul>
        )}
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Archive brand?"
          description={`Archive “${deleteTarget?.name ?? ''}”? It moves to the recycle bin. If active products use it, deactivate the brand instead.`}
          confirmLabel="Archive brand"
          destructive
          loading={busy}
          onConfirm={() => (deleteTarget ? handleDelete(deleteTarget) : undefined)}
        />
      </div>
    </PageShell>
  );
}

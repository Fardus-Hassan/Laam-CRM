'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Package, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type {
  InventoryProductDetail,
  ProductStatus,
  ProductVariant,
  StockMovement,
} from '@laam/types';

import { Can } from '@/components/auth/can';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { FormTextarea } from '@/components/form/form-textarea';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InventorySubNav } from '@/features/inventory/components/inventory-sub-nav';
import { StockStatusBadge } from '@/features/inventory/components/shared/stock-status-badge';
import { PRODUCT_STATUS_LABELS } from '@/features/inventory/config/product-filters';
import { useOrgCategoryOptions } from '@/features/settings/hooks/use-org-categories';
import { productBrandsApi } from '@/features/settings/api/product-brands-api';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { useProductMutations } from '@/features/inventory/hooks/use-product-mutations';
import { useInventoryUnits } from '@/features/inventory/hooks/use-inventory-units';
import { ProductImageField } from '@/features/inventory/components/create-product-page';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type ProductDetailViewProps = {
  productId: string;
};

const STATUS_OPTIONS = (Object.keys(PRODUCT_STATUS_LABELS) as ProductStatus[]).map((value) => ({
  value,
  label: PRODUCT_STATUS_LABELS[value],
}));

function emptyVariant(skuBase: string, baseUomCode = 'pcs'): ProductVariant {
  return {
    id: `new-${Date.now()}`,
    label: 'Standard',
    sku: `${skuBase}-STD`,
    baseUomCode,
    salePrice: 0,
    costPrice: 0,
    stock: 0,
    reorderLevel: 5,
  };
}

export function ProductDetailView({ productId }: ProductDetailViewProps) {
  const router = useRouter();
  const {
    updateProduct,
    deleteProduct,
    restoreProduct,
    hardDeleteProduct,
    adjustStock: mutateStock,
    uploadProductImage,
    isLoading,
  } = useProductMutations();
  const { unitOptions, defaultCode } = useInventoryUnits();
  const categoryOptions = useOrgCategoryOptions('product');
  const [brandOptions, setBrandOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [product, setProduct] = React.useState<InventoryProductDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [movements, setMovements] = React.useState<StockMovement[]>([]);
  const [movementsError, setMovementsError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [purgeOpen, setPurgeOpen] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [selectedVariantId, setSelectedVariantId] = React.useState('');
  const [draft, setDraft] = React.useState({
    name: '',
    sku: '',
    description: '',
    notes: '',
    status: 'active' as ProductStatus,
    brandId: '',
    category: '',
    reorderLevel: 5,
    imageUrl: '',
    variants: [] as ProductVariant[],
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setMovementsError(null);
    try {
      const data = await inventoryApi.getProduct(productId, { includeDeleted: true });
      setProduct(data);
      if (data) {
        try {
          const movementData = await inventoryApi.listStockMovements(productId, {
            page: 1,
            pageSize: 20,
          });
          setMovements(movementData.items);
        } catch (error) {
          setMovements([]);
          setMovementsError(
            error instanceof Error ? error.message : 'Could not load stock movements',
          );
        }
        setSelectedVariantId((current) =>
          data.variants.some((v) => v.id === current) ? current : (data.variants[0]?.id ?? ''),
        );
        setDraft({
          name: data.name,
          sku: data.sku,
          description: data.description ?? '',
          notes: data.notes ?? '',
          status: data.status,
          brandId: data.brandId ?? '',
          category: data.category,
          reorderLevel: data.reorderLevel,
          imageUrl: data.imageUrl ?? '',
          variants: data.variants.map((v) => ({ ...v })),
        });
        setPendingFile(null);
      }
    } catch (error) {
      setProduct(null);
      setLoadError(error instanceof Error ? error.message : 'Could not load product');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    void productBrandsApi.list().then((brands) => {
      setBrandOptions(
        brands
          .filter((b) => b.isActive)
          .map((b) => ({ value: b.id, label: b.name })),
      );
    });
  }, []);

  function patchVariant(index: number, values: Partial<ProductVariant>) {
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant, i) =>
        i === index ? { ...variant, ...values } : variant,
      ),
    }));
  }

  async function adjustStock(delta: number) {
    if (!product || !selectedVariantId) {
      toast.error('Select a variant to adjust stock');
      return;
    }
    await mutateStock(product.id, {
      delta,
      reason: 'Quick adjust from detail',
      variantId: selectedVariantId,
    });
    await load();
  }

  async function changeCategory(categorySlug: string) {
    if (!product || categorySlug === product.category) return;
    const selected = categoryOptions.find((c) => c.value === categorySlug);
    await updateProduct(product.id, {
      category: categorySlug,
      categoryId: selected?.id,
    });
    void load();
  }

  async function changeBrand(brandId: string) {
    if (!product || brandId === (product.brandId ?? '')) return;
    await updateProduct(product.id, { brandId: brandId || null });
    void load();
  }

  async function changeStatus(status: ProductStatus) {
    if (!product || status === product.status) return;
    await updateProduct(product.id, { status });
    void load();
  }

  async function handleSave() {
    if (!product) return;
    if (!draft.name.trim() || !draft.sku.trim()) {
      toast.error('Name and SKU are required');
      return;
    }
    if (!draft.variants.length || draft.variants.some((v) => v.salePrice <= 0 || !v.sku.trim())) {
      toast.error('Each variant needs a SKU and sale price');
      return;
    }
    const skus = draft.variants.map((variant) => variant.sku.trim().toUpperCase());
    if (new Set(skus).size !== skus.length) {
      toast.error('Variant SKUs must be unique');
      return;
    }
    const selectedCategory = categoryOptions.find((c) => c.value === draft.category);
    await updateProduct(product.id, {
      name: draft.name.trim(),
      sku: draft.sku.trim().toUpperCase(),
      description: draft.description.trim() || undefined,
      notes: draft.notes.trim() || undefined,
      status: draft.status,
      brandId: draft.brandId || null,
      category: draft.category || undefined,
      categoryId: selectedCategory?.id,
      reorderLevel: draft.reorderLevel,
      imageUrl: draft.imageUrl.startsWith('data:') ? undefined : draft.imageUrl || undefined,
      variants: draft.variants.map((v) => ({
        ...v,
        sku: v.sku.trim().toUpperCase(),
        label: v.label.trim() || 'Standard',
        baseUomCode: v.baseUomCode || defaultCode('pcs'),
      })),
    });
    if (pendingFile) {
      await uploadProductImage(product.id, pendingFile);
    }
    toast.success('Product updated');
    setEditing(false);
    void load();
  }

  async function handleDelete() {
    if (!product) return;
    await deleteProduct(product.id);
    setDeleteOpen(false);
    router.push('/dashboard/inventory/products');
  }

  async function handleRestore() {
    if (!product) return;
    await restoreProduct(product.id);
    await load();
  }

  async function handlePurge() {
    if (!product) return;
    await hardDeleteProduct(product.id);
    setPurgeOpen(false);
    router.push('/dashboard/recycle-bin');
  }

  if (loading) {
    return <p className="p-4 text-sm text-muted-foreground">Loading product…</p>;
  }

  if (!product) {
    return (
      <PageShell
        title={loadError ? 'Could not load product' : 'Product not found'}
        description={loadError ?? 'This product may have been removed.'}
      >
        <Button type="button" variant="outline" asChild>
          <Link href="/dashboard/inventory/products">Back to products</Link>
        </Button>
      </PageShell>
    );
  }

  const isArchived = Boolean(product.deletedAt);
  const selectedVariant =
    product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0];

  return (
    <PageShell
      title={product.name}
      description={
        isArchived
          ? `SKU ${product.sku} · Archived ${new Date(product.deletedAt!).toLocaleString()}`
          : `SKU ${product.sku}`
      }
      breadcrumbs={[
        { label: 'Inventory', href: '/dashboard/inventory/products' },
        { label: product.name },
      ]}
    >
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <InventorySubNav />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={isArchived ? '/dashboard/recycle-bin' : '/dashboard/inventory/products'}>
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          {isArchived ? (
            <Can permission="inventory.delete">
              <Button type="button" size="sm" disabled={isLoading} onClick={() => void handleRestore()}>
                Restore product
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-destructive"
                disabled={isLoading}
                onClick={() => setPurgeOpen(true)}
              >
                <Trash2 className="size-4" />
                Delete permanently
              </Button>
            </Can>
          ) : !editing ? (
            <>
              <Can permission="inventory.edit">
                <Button type="button" size="sm" onClick={() => setEditing(true)}>
                  Edit product
                </Button>
              </Can>
              <Can permission="inventory.delete">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  disabled={isLoading}
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-4" />
                  Archive
                </Button>
              </Can>
            </>
          ) : (
            <>
              <Button type="button" size="sm" disabled={isLoading} onClick={() => void handleSave()}>
                Save changes
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  void load();
                }}
              >
                Cancel
              </Button>
            </>
          )}
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-3">
          <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 lg:col-span-2')}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Overview</CardTitle>
            </CardHeader>
            <CardContent className={ORDER_SECTION_BODY_CLASS}>
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative mx-auto size-24 shrink-0 overflow-hidden rounded-lg border bg-muted sm:mx-0">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                      unoptimized={
                        product.imageUrl.startsWith('data:') ||
                        product.imageUrl.startsWith('/api/') ||
                        product.imageUrl.includes('localhost')
                      }
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Package className="size-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {isArchived ? <Badge variant="destructive">Archived</Badge> : null}
                    <Badge variant="secondary">{PRODUCT_STATUS_LABELS[product.status]}</Badge>
                    <StockStatusBadge status={product.stockStatus} />
                  </div>

                  {editing && !isArchived ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField label="Name" required>
                        <FormInput
                          value={draft.name}
                          onChange={(e) => setDraft((c) => ({ ...c, name: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="SKU" required>
                        <FormInput
                          value={draft.sku}
                          onChange={(e) =>
                            setDraft((c) => ({ ...c, sku: e.target.value.toUpperCase() }))
                          }
                        />
                      </FormField>
                      <FormField label="Brand">
                        <FormSearchSelect
                          value={draft.brandId}
                          onChange={(v) => setDraft((c) => ({ ...c, brandId: v }))}
                          options={[{ value: '', label: 'No brand' }, ...brandOptions]}
                          searchable={false}
                        />
                      </FormField>
                      <FormField label="Category">
                        <FormSearchSelect
                          value={draft.category}
                          onChange={(v) => setDraft((c) => ({ ...c, category: v }))}
                          options={categoryOptions}
                          searchable={false}
                        />
                      </FormField>
                      <FormField label="Status">
                        <FormSearchSelect
                          value={draft.status}
                          onChange={(v) => setDraft((c) => ({ ...c, status: v as ProductStatus }))}
                          options={STATUS_OPTIONS}
                          searchable={false}
                        />
                      </FormField>
                      <FormField label="Reorder level">
                        <FormInput
                          type="number"
                          min={0}
                          value={draft.reorderLevel}
                          onChange={(e) =>
                            setDraft((c) => ({
                              ...c,
                              reorderLevel: Number(e.target.value) || 0,
                            }))
                          }
                        />
                      </FormField>
                      <FormField label="Description" className="sm:col-span-2">
                        <FormTextarea
                          rows={2}
                          value={draft.description}
                          onChange={(e) => setDraft((c) => ({ ...c, description: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="Notes" className="sm:col-span-2">
                        <FormTextarea
                          rows={2}
                          value={draft.notes}
                          onChange={(e) => setDraft((c) => ({ ...c, notes: e.target.value }))}
                        />
                      </FormField>
                      <div className="sm:col-span-2">
                        <ProductImageField
                          imageUrl={draft.imageUrl}
                          onChange={(imageUrl) => setDraft((current) => ({ ...current, imageUrl }))}
                          onFileChange={setPendingFile}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <Can permission="inventory.edit">
                        <div className="mx-auto grid max-w-xs gap-3 sm:mx-0 sm:max-w-md sm:grid-cols-2">
                          <FormField label="Brand">
                            <FormSearchSelect
                              value={product.brandId ?? ''}
                              onChange={(v) => void changeBrand(v)}
                              options={[{ value: '', label: 'No brand' }, ...brandOptions]}
                              searchable={false}
                            />
                          </FormField>
                          <FormField label="Category">
                            <FormSearchSelect
                              value={product.category}
                              onChange={(v) => void changeCategory(v)}
                              options={categoryOptions}
                              searchable={false}
                            />
                          </FormField>
                          <FormField label="Status">
                            <FormSearchSelect
                              value={product.status}
                              onChange={(v) => void changeStatus(v as ProductStatus)}
                              options={STATUS_OPTIONS}
                              searchable={false}
                            />
                          </FormField>
                        </div>
                      </Can>
                      {product.description ? (
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      ) : null}
                      {product.supplierName ? (
                        <p className="text-sm">
                          Supplier: <span className="font-medium">{product.supplierName}</span>
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Stock</CardTitle>
            </CardHeader>
            <CardContent className={ORDER_SECTION_BODY_CLASS}>
              {product.variants.length > 1 ? (
                <FormField label="Variant" className="mb-3">
                  <FormSearchSelect
                    value={selectedVariantId}
                    onChange={setSelectedVariantId}
                    options={product.variants.map((v) => ({
                      value: v.id,
                      label: `${v.label} (${v.stock})`,
                    }))}
                    searchable={false}
                  />
                </FormField>
              ) : null}
              <div className="flex items-center justify-center gap-3">
                <Can permission="inventory.adjust">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={!selectedVariant || isLoading}
                    onClick={() => void adjustStock(-1)}
                  >
                    <Minus className="size-4" />
                  </Button>
                </Can>
                <span className="text-3xl font-bold tabular-nums">
                  {selectedVariant?.stock ?? product.stock}
                </span>
                <Can permission="inventory.adjust">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={!selectedVariant || isLoading}
                    onClick={() => void adjustStock(1)}
                  >
                    <Plus className="size-4" />
                  </Button>
                </Can>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {selectedVariant
                  ? `${selectedVariant.label} · reorder at ${selectedVariant.reorderLevel}`
                  : `Reorder at ${product.reorderLevel} units`}
              </p>
              <p className="mt-3 text-center text-sm">
                Total stock {product.stock} · value ~{' '}
                {formatCurrency(product.stock * (product.costPrice ?? product.salePriceMin * 0.6))}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden')}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Variants</CardTitle>
              {editing ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDraft((c) => ({
                      ...c,
                      variants: [...c.variants, emptyVariant(c.sku || product.sku, defaultCode('pcs'))],
                    }))
                  }
                >
                  <Plus className="size-4" />
                  Add variant
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'p-0 sm:p-0')}>
            {editing ? (
              <div className="space-y-3 p-4">
                {draft.variants.map((variant, index) => (
                  <div
                    key={variant.id}
                    className="grid gap-2 rounded-lg border border-border/70 p-3 sm:grid-cols-2 lg:grid-cols-7"
                  >
                    <FormField label="Label">
                      <FormInput
                        value={variant.label}
                        onChange={(e) => patchVariant(index, { label: e.target.value })}
                      />
                    </FormField>
                    <FormField label="SKU">
                      <FormInput
                        value={variant.sku}
                        onChange={(e) =>
                          patchVariant(index, { sku: e.target.value.toUpperCase() })
                        }
                      />
                    </FormField>
                    <FormField label="Barcode">
                      <FormInput
                        value={variant.barcode ?? ''}
                        onChange={(e) =>
                          patchVariant(index, { barcode: e.target.value || undefined })
                        }
                      />
                    </FormField>
                    <FormField label="Sale">
                      <FormInput
                        type="number"
                        min={0}
                        value={variant.salePrice}
                        onChange={(e) =>
                          patchVariant(index, { salePrice: Number(e.target.value) || 0 })
                        }
                      />
                    </FormField>
                    <FormField label="Cost">
                      <FormInput
                        type="number"
                        min={0}
                        value={variant.costPrice ?? 0}
                        onChange={(e) =>
                          patchVariant(index, { costPrice: Number(e.target.value) || 0 })
                        }
                      />
                    </FormField>
                    <FormField label="Stock">
                      <FormInput
                        type="number"
                        min={0}
                        value={variant.stock}
                        onChange={(e) =>
                          patchVariant(index, { stock: Number(e.target.value) || 0 })
                        }
                      />
                    </FormField>
                    <FormField label="Base unit">
                      <FormSearchSelect
                        value={variant.baseUomCode ?? defaultCode('pcs')}
                        onChange={(code) => patchVariant(index, { baseUomCode: code })}
                        options={unitOptions}
                      />
                    </FormField>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={draft.variants.length <= 1}
                        onClick={() =>
                          setDraft((c) => ({
                            ...c,
                            variants: c.variants.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="divide-y md:hidden">
                  {product.variants.map((v) => (
                    <div key={v.id} className="space-y-1 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{v.label}</p>
                        <span className="shrink-0 tabular-nums text-sm">{v.stock} in stock</span>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{v.sku}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <span>Sale {formatCurrency(v.salePrice)}</span>
                        <span className="text-muted-foreground">
                          Cost {v.costPrice ? formatCurrency(v.costPrice) : '—'}
                        </span>
                        {v.baseUomCode ? (
                          <span className="text-muted-foreground">Unit {v.baseUomCode}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto p-4 md:block">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-4">Label</th>
                        <th className="pb-2 pr-4">SKU</th>
                        <th className="pb-2 pr-4">Sale</th>
                        <th className="pb-2 pr-4">Cost</th>
                        <th className="pb-2 pr-4">Unit</th>
                        <th className="pb-2">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.variants.map((v) => (
                        <tr key={v.id} className="border-b border-border/50">
                          <td className="py-2 pr-4 font-medium">{v.label}</td>
                          <td className="py-2 pr-4 font-mono text-xs">{v.sku}</td>
                          <td className="py-2 pr-4">{formatCurrency(v.salePrice)}</td>
                          <td className="py-2 pr-4">
                            {v.costPrice ? formatCurrency(v.costPrice) : '—'}
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">{v.baseUomCode ?? 'pcs'}</td>
                          <td className="py-2 tabular-nums">{v.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Stock movements</CardTitle>
          </CardHeader>
          <CardContent className={ORDER_SECTION_BODY_CLASS}>
            {movementsError ? (
              <p className="text-sm text-destructive">{movementsError}</p>
            ) : movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stock movements yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {movements.map((movement) => (
                  <li key={movement.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                    <div>
                      <p className="font-medium">
                        {movement.variantLabel ?? movement.variantSku ?? 'Variant'} ·{' '}
                        <span className={movement.delta > 0 ? 'text-emerald-600' : 'text-destructive'}>
                          {movement.delta > 0 ? '+' : ''}
                          {movement.delta}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {movement.previousStock} → {movement.newStock} · {movement.reason}
                        {movement.note ? ` · ${movement.note}` : ''}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{new Date(movement.createdAt).toLocaleString()}</p>
                      {movement.actorName ? <p>{movement.actorName}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {product.activities.length > 0 ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Activity</CardTitle>
            </CardHeader>
            <CardContent className={ORDER_SECTION_BODY_CLASS}>
              <ul className="divide-y divide-border">
                {product.activities.map((activity) => (
                  <li key={activity.id} className="py-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-medium">{activity.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {activity.description ? (
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                    ) : null}
                    {activity.actorName ? (
                      <p className="text-xs text-muted-foreground">By {activity.actorName}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {!editing && product.notes ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent className={ORDER_SECTION_BODY_CLASS}>
              <p className="text-sm">{product.notes}</p>
            </CardContent>
          </Card>
        ) : null}
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Archive product?"
          description={`Archive “${product.name}”? It will move to the recycle bin and can be restored later.`}
          confirmLabel="Archive product"
          destructive
          loading={isLoading}
          onConfirm={handleDelete}
        />
        <ConfirmDialog
          open={purgeOpen}
          onOpenChange={setPurgeOpen}
          title="Delete permanently?"
          description={`Permanently delete “${product.name}”? This cannot be undone.`}
          confirmLabel="Delete permanently"
          destructive
          loading={isLoading}
          onConfirm={handlePurge}
        />
      </div>
    </PageShell>
  );
}

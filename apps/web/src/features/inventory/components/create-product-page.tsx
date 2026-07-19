'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ProductStatus, ProductVariant } from '@laam/types';
import {
  ArrowLeft,
  ImagePlus,
  Link2,
  Package,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { Can } from '@/components/auth/can';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { FormTextarea } from '@/components/form/form-textarea';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InventorySubNav } from '@/features/inventory/components/inventory-sub-nav';
import {
  PRODUCT_STATUS_LABELS,
} from '@/features/inventory/config/product-filters';
import { useOrgCategoryOptions } from '@/features/settings/hooks/use-org-categories';
import { productBrandsApi } from '@/features/settings/api/product-brands-api';
import { MOCK_SUPPLIERS } from '@/features/inventory/data/mock-inventory';
import { useProductMutations } from '@/features/inventory/hooks/use-product-mutations';
import { ORDER_CARD_CLASS } from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api/errors';

const STATUS_OPTIONS = (Object.keys(PRODUCT_STATUS_LABELS) as ProductStatus[]).map((v) => ({
  value: v,
  label: PRODUCT_STATUS_LABELS[v],
}));

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function emptyVariant(sku: string): ProductVariant {
  return {
    id: `new-${Date.now()}`,
    label: 'Standard',
    sku: `${sku}-STD`,
    salePrice: 0,
    costPrice: 0,
    stock: 0,
    reorderLevel: 5,
  };
}

export function ProductImageField({
  imageUrl,
  onChange,
  onFileChange,
}: {
  imageUrl: string;
  onChange: (url: string) => void;
  onFileChange?: (file: File | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [mode, setMode] = React.useState<'upload' | 'url'>('upload');
  const [dragging, setDragging] = React.useState(false);
  const [urlDraft, setUrlDraft] = React.useState(imageUrl.startsWith('data:') ? '' : imageUrl);

  React.useEffect(() => {
    if (imageUrl && !imageUrl.startsWith('data:')) {
      setUrlDraft(imageUrl);
    }
  }, [imageUrl]);

  function readFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file (JPG, PNG, WebP)');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be under 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        onFileChange?.(file);
        onChange(result);
        setMode('upload');
        toast.success('Image ready');
      }
    };
    reader.onerror = () => toast.error('Could not read image');
    reader.readAsDataURL(file);
  }

  function applyUrl() {
    const next = urlDraft.trim();
    if (!next) {
      onFileChange?.(null);
      onChange('');
      return;
    }
    if (!/^https?:\/\//i.test(next) && !next.startsWith('data:')) {
      toast.error('Enter a valid http(s) image URL');
      return;
    }
    onFileChange?.(null);
    onChange(next);
    toast.success('Image URL applied');
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
        <button
          type="button"
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            mode === 'upload' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setMode('upload')}
        >
          <Upload className="size-3.5" />
          Upload
        </button>
        <button
          type="button"
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            mode === 'url' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setMode('url')}
        >
          <Link2 className="size-3.5" />
          Image URL
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative mx-auto aspect-square w-full max-w-[11rem] shrink-0 overflow-hidden rounded-xl border bg-muted sm:mx-0 sm:w-40">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URLs & arbitrary hosts
            <img src={imageUrl} alt="Product preview" className="size-full object-cover" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <Package className="size-8" />
              <span className="text-[11px]">No image</span>
            </div>
          )}
          {imageUrl ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute right-2 top-2 size-7 shadow-sm"
              onClick={() => {
                onFileChange?.(null);
                onChange('');
                setUrlDraft('');
                if (inputRef.current) inputRef.current.value = '';
              }}
              aria-label="Remove image"
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {mode === 'upload' ? (
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
              }}
              onClick={() => inputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) readFile(file);
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors',
                dragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40',
              )}
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <ImagePlus className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Drop image here or click to browse</p>
                <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP · max 2 MB</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) readFile(file);
                }}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <FormField label="Image URL">
                <FormInput
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  placeholder="https://images.example.com/modhu.jpg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyUrl();
                    }
                  }}
                />
              </FormField>
              <Button type="button" size="sm" variant="outline" onClick={applyUrl}>
                Apply URL
              </Button>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Upload a photo from your device, or paste a public image link. Preview updates instantly.
          </p>
        </div>
      </div>
    </div>
  );
}

export function CreateProductPage() {
  const router = useRouter();
  const { createProduct, uploadProductImage, isLoading } = useProductMutations();
  const categoryOptions = useOrgCategoryOptions('product');
  const [brandOptions, setBrandOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [skuError, setSkuError] = React.useState<string | undefined>();
  const [draft, setDraft] = React.useState({
    name: '',
    sku: '',
    category: '',
    brandId: '',
    status: 'active' as ProductStatus,
    description: '',
    imageUrl: '',
    supplierName: '',
    reorderLevel: 5,
    notes: '',
    variants: [emptyVariant('SKU')],
  });

  React.useEffect(() => {
    void productBrandsApi.list().then((brands) => {
      setBrandOptions(
        brands
          .filter((b) => b.isActive)
          .map((b) => ({ value: b.id, label: b.name })),
      );
    });
  }, []);

  React.useEffect(() => {
    if (!draft.category && categoryOptions[0]) {
      setDraft((c) => ({ ...c, category: categoryOptions[0]!.value }));
    }
  }, [categoryOptions, draft.category]);

  function patch(values: Partial<typeof draft>) {
    setDraft((c) => ({ ...c, ...values }));
  }

  function updateVariant(index: number, values: Partial<ProductVariant>) {
    setDraft((c) => ({
      ...c,
      variants: c.variants.map((v, i) => (i === index ? { ...v, ...values } : v)),
    }));
  }

  const canSubmit =
    draft.name.trim() && draft.sku.trim() && draft.variants.every((v) => v.salePrice > 0);

  async function handleSubmit() {
    setSkuError(undefined);
    if (!canSubmit) {
      toast.error('Name, SKU, and sale price are required');
      return;
    }
    const normalizedSkus = draft.variants.map((variant) => variant.sku.trim().toUpperCase());
    if (normalizedSkus.some((sku) => !sku)) {
      setSkuError('Every variant needs a SKU');
      toast.error('Every variant needs a SKU');
      return;
    }
    if (new Set(normalizedSkus).size !== normalizedSkus.length) {
      setSkuError('Variant SKUs must be unique');
      toast.error('Variant SKUs must be unique');
      return;
    }
    const selectedCategory = categoryOptions.find((c) => c.value === draft.category);
    try {
      const product = await createProduct({
        name: draft.name.trim(),
        sku: draft.sku.trim().toUpperCase(),
        category: draft.category || undefined,
        categoryId: selectedCategory?.id,
        brandId: draft.brandId || undefined,
        status: draft.status,
        description: draft.description.trim() || undefined,
        imageUrl: draft.imageUrl.startsWith('data:') ? undefined : draft.imageUrl.trim() || undefined,
        supplierName: draft.supplierName || undefined,
        reorderLevel: draft.reorderLevel,
        notes: draft.notes.trim() || undefined,
        variants: draft.variants.map((v) => ({
          ...v,
          sku: v.sku.trim().toUpperCase(),
        })),
      });
      if (pendingFile) {
        await uploadProductImage(product.id, pendingFile);
      }
      router.push('/dashboard/inventory/products');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setSkuError('A product or variant with this SKU already exists');
      }
    }
  }

  return (
    <PageShell
      title="New product"
      description="Add a product with variants, stock, and pricing."
      breadcrumbs={[
        { label: 'Inventory', href: '/dashboard/inventory/products' },
        { label: 'New product' },
      ]}
    >
      <div className="min-w-0 space-y-4 sm:space-y-5">
        <InventorySubNav />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">Create product</h2>
            <p className="text-sm text-muted-foreground">
              Photo, pricing, and stock for modhu, khejur, or combos.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0 self-start" asChild>
            <Link href="/dashboard/inventory/products">
              <ArrowLeft className="size-4" />
              Back to products
            </Link>
          </Button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="mx-auto w-full max-w-4xl space-y-4 pb-28 sm:space-y-5 sm:pb-6"
        >
          <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden')}>
            <CardHeader className="border-b px-4 py-3 sm:px-5">
              <CardTitle className="text-sm font-semibold">Basic info</CardTitle>
              <p className="text-xs text-muted-foreground">Name, category, and how it appears in the catalog.</p>
            </CardHeader>
            <CardContent className="space-y-5 p-4 sm:p-5">
              <FormField label="Product name" required>
                <FormInput
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="Modhu (Honey) 500ml"
                />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="SKU" required error={skuError}>
                  <FormInput
                    value={draft.sku}
                    onChange={(e) => patch({ sku: e.target.value.toUpperCase() })}
                    placeholder="MDH-500"
                  />
                </FormField>
                <FormField label="Brand">
                  <FormSearchSelect
                    value={draft.brandId}
                    onChange={(v) => patch({ brandId: v })}
                    options={brandOptions}
                    placeholder="Select brand…"
                    searchable={false}
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    <Link href="/dashboard/inventory/brands" className="font-medium text-primary hover:underline">
                      Manage brands
                    </Link>
                  </p>
                </FormField>
                <FormField label="Category">
                  <FormSearchSelect
                    value={draft.category}
                    onChange={(v) => patch({ category: v })}
                    options={categoryOptions}
                    searchable={false}
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    <Link href="/dashboard/settings/categories" className="font-medium text-primary hover:underline">
                      Manage categories
                    </Link>
                  </p>
                </FormField>
                <FormField label="Status">
                  <FormSearchSelect
                    value={draft.status}
                    onChange={(v) => patch({ status: v as ProductStatus })}
                    options={STATUS_OPTIONS}
                    searchable={false}
                  />
                </FormField>
                <FormField label="Supplier">
                  <FormSearchSelect
                    value={draft.supplierName}
                    onChange={(v) => patch({ supplierName: v })}
                    options={MOCK_SUPPLIERS.map((s) => ({ value: s.name, label: s.name }))}
                    placeholder="Select supplier…"
                  />
                </FormField>
              </div>

              <FormField label="Description">
                <FormTextarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="Short description for agents and catalog…"
                />
              </FormField>

              <FormField label="Notes (internal)">
                <FormTextarea
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                  placeholder="Shelf life, storage, packing tips…"
                />
              </FormField>
            </CardContent>
          </Card>

          <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden')}>
            <CardHeader className="border-b px-4 py-3 sm:px-5">
              <CardTitle className="text-sm font-semibold">Product image</CardTitle>
              <p className="text-xs text-muted-foreground">
                Upload from device or paste an image URL.
              </p>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <ProductImageField
                imageUrl={draft.imageUrl}
                onChange={(imageUrl) => patch({ imageUrl })}
                onFileChange={setPendingFile}
              />
            </CardContent>
          </Card>

          <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden')}>
            <CardHeader className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <CardTitle className="text-sm font-semibold">Variants & stock</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Sale price, cost, and stock per size or pack.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 self-start"
                onClick={() =>
                  patch({
                    variants: [
                      ...draft.variants,
                      {
                        ...emptyVariant(draft.sku || 'SKU'),
                        id: `new-${Date.now()}`,
                        label: `Variant ${draft.variants.length + 1}`,
                      },
                    ],
                  })
                }
              >
                <Plus className="size-3.5" />
                Add variant
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5">
              {draft.variants.map((variant, index) => (
                <div
                  key={variant.id}
                  className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-3 sm:p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Variant {index + 1}</p>
                    {draft.variants.length > 1 ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 shrink-0 text-destructive"
                        onClick={() =>
                          patch({ variants: draft.variants.filter((_, i) => i !== index) })
                        }
                        aria-label={`Remove variant ${index + 1}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <FormField label="Label">
                      <FormInput
                        value={variant.label}
                        onChange={(e) => updateVariant(index, { label: e.target.value })}
                        placeholder="Standard / 500g"
                      />
                    </FormField>
                    <FormField label="Variant SKU" error={skuError}>
                      <FormInput
                        value={variant.sku}
                        onChange={(e) => updateVariant(index, { sku: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Barcode">
                      <FormInput
                        value={variant.barcode ?? ''}
                        onChange={(e) =>
                          updateVariant(index, { barcode: e.target.value || undefined })
                        }
                        placeholder="EAN / UPC (optional)"
                      />
                    </FormField>
                    <FormField label="Sale price (৳)" required>
                      <FormInput
                        type="number"
                        min={0}
                        value={variant.salePrice || ''}
                        onChange={(e) =>
                          updateVariant(index, { salePrice: Number(e.target.value) })
                        }
                      />
                    </FormField>
                    <FormField label="Cost price (৳)">
                      <FormInput
                        type="number"
                        min={0}
                        value={variant.costPrice || ''}
                        onChange={(e) =>
                          updateVariant(index, { costPrice: Number(e.target.value) })
                        }
                      />
                    </FormField>
                    <FormField label="Stock">
                      <FormInput
                        type="number"
                        min={0}
                        value={variant.stock}
                        onChange={(e) => updateVariant(index, { stock: Number(e.target.value) })}
                      />
                    </FormField>
                    <FormField label="Reorder level">
                      <FormInput
                        type="number"
                        min={0}
                        value={variant.reorderLevel}
                        onChange={(e) =>
                          updateVariant(index, { reorderLevel: Number(e.target.value) })
                        }
                      />
                    </FormField>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Desktop actions */}
          <div className="hidden justify-end gap-2 sm:flex">
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/inventory/products">Cancel</Link>
            </Button>
            <Can permission="inventory.create">
              <Button type="submit" disabled={!canSubmit || isLoading}>
                {isLoading ? 'Creating…' : 'Create product'}
              </Button>
            </Can>
          </div>

          {/* Mobile sticky actions — sits above quick-action FAB */}
          <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:hidden">
            <div className="mx-auto flex max-w-4xl gap-2">
              <Button type="button" variant="outline" className="flex-1" asChild>
                <Link href="/dashboard/inventory/products">Cancel</Link>
              </Button>
              <Can permission="inventory.create">
                <Button type="submit" className="flex-1" disabled={!canSubmit || isLoading}>
                  {isLoading ? 'Creating…' : 'Create product'}
                </Button>
              </Can>
            </div>
          </div>
        </form>
      </div>
    </PageShell>
  );
}

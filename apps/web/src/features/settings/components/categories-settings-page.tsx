'use client';

import * as React from 'react';
import Link from 'next/link';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { OrgCategory, OrgCategoryKind } from '@laam/types';

import { FormField } from '@/components/form/form-field';
import { Can } from '@/components/auth/can';
import { FormInput } from '@/components/form/form-input';
import { FormTextarea } from '@/components/form/form-textarea';
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
import { orgCategoriesApi } from '@/features/settings/api/org-categories-api';
import { ORG_CATEGORY_KIND_LABELS } from '@/features/settings/data/mock-org-category-seeds';
import { useOrgCategories } from '@/features/settings/hooks/use-org-categories';
import { cn } from '@/lib/utils';

const TABS: OrgCategoryKind[] = ['product', 'income', 'expense', 'knowledge'];

const TAB_HINTS: Record<OrgCategoryKind, string> = {
  product: 'Used when creating products and filtering inventory lists.',
  income: 'Used on manual income entries and P&L grouping.',
  expense: 'Used on manual expense entries and expense reports.',
  knowledge: 'Organizes help articles for support bots and agents.',
};

export function CategoriesSettingsPage() {
  const [activeKind, setActiveKind] = React.useState<OrgCategoryKind>('product');
  const { categories, loading, error, refresh } = useOrgCategories(activeKind);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState({
    label: '',
    slug: '',
    description: '',
  });
  const [busy, setBusy] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<OrgCategory | null>(null);

  React.useEffect(() => {
    setEditingId(null);
    setDraft({ label: '', slug: '', description: '' });
  }, [activeKind]);

  function resetDraft() {
    setEditingId(null);
    setDraft({ label: '', slug: '', description: '' });
  }

  function startEdit(category: OrgCategory) {
    setEditingId(category.id);
    setDraft({
      label: category.label,
      slug: category.slug,
      description: category.description ?? '',
    });
  }

  async function handleSave() {
    if (!draft.label.trim()) {
      toast.error('Label is required');
      return;
    }

    const slug = (draft.slug.trim() || draft.label).replace(/\s+/g, '_').toLowerCase();
    if (
      categories.some(
        (item) => item.slug === slug && item.id !== editingId,
      )
    ) {
      toast.error('A category with this slug already exists');
      return;
    }

    setBusy(true);
    try {
      await orgCategoriesApi.upsert({
        id: editingId ?? undefined,
        kind: activeKind,
        slug,
        label: draft.label.trim(),
        description: draft.description.trim() || undefined,
        sortOrder: editingId
          ? categories.find((c) => c.id === editingId)?.sortOrder ?? categories.length
          : categories.length,
        isActive: editingId
          ? categories.find((c) => c.id === editingId)?.isActive ?? true
          : true,
        isSystem: editingId
          ? categories.find((c) => c.id === editingId)?.isSystem ?? false
          : false,
      });
      await refresh();
      resetDraft();
      toast.success(editingId ? 'Category updated' : 'Category created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save category');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(category: OrgCategory) {
    setBusy(true);
    try {
      await orgCategoriesApi.setActive(category.id, !category.isActive);
      await refresh();
      toast.success(category.isActive ? 'Category deactivated' : 'Category activated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(category: OrgCategory) {
    if (category.isSystem) {
      toast.error('System categories cannot be deleted');
      return;
    }
    setBusy(true);
    try {
      await orgCategoriesApi.remove(category.id);
      await refresh();
      if (editingId === category.id) resetDraft();
      setDeleteTarget(null);
      toast.success('Category removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      title="Categories"
      description="Org-specific categories for products, accounting, and knowledge."
    >
      <div className="space-y-4">
        <p className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Categories are scoped to your organization. System categories cannot be deleted — deactivate
          only. Product brands live under Inventory → Brands.{' '}
          <Link href="/dashboard/inventory/brands" className="font-medium text-primary hover:underline">
            Manage brands
          </Link>
        </p>

        <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
          {TABS.map((kind) => (
            <button
              key={kind}
              type="button"
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                activeKind === kind
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setActiveKind(kind)}
            >
              {ORG_CATEGORY_KIND_LABELS[kind]}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">{TAB_HINTS[activeKind]}</p>

        <Can permission={['settings.manage', 'inventory.create', 'inventory.edit']} match="any">
          <Card className="gap-0 py-0 shadow-none">
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">
                {editingId
                  ? `Edit ${ORG_CATEGORY_KIND_LABELS[activeKind].toLowerCase()}`
                  : `Add ${ORG_CATEGORY_KIND_LABELS[activeKind].toLowerCase()}`}
              </CardTitle>
              {editingId ? (
                <Button type="button" variant="ghost" size="sm" onClick={resetDraft}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
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
                onChange={(event) =>
                  setDraft((current) => ({ ...current, label: event.target.value }))
                }
                placeholder={activeKind === 'product' ? 'Spices' : 'Office supplies'}
              />
            </FormField>
            <FormField label="Slug (optional)">
              <FormInput
                value={draft.slug}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, slug: event.target.value }))
                }
                placeholder="auto_from_label"
              />
            </FormField>
            <FormField label="Description">
              <FormTextarea
                rows={2}
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Optional note"
              />
            </FormField>
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <Button type="button" size="sm" disabled={busy} onClick={() => void handleSave()}>
                <Plus className="size-4" />
                {editingId ? 'Save category' : 'Add category'}
              </Button>
            </div>
          </CardContent>
          </Card>
        </Can>

        <ul className="divide-y divide-border rounded-lg border border-border">
          {loading ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">Loading…</li>
          ) : error ? (
            <li className="px-3 py-8 text-center text-sm text-destructive">{error}</li>
          ) : categories.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">No categories yet</li>
          ) : (
            categories.map((category) => (
              <li
                key={category.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{category.label}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {category.slug}
                    </Badge>
                    {category.isSystem ? <Badge variant="secondary">System</Badge> : null}
                    {!category.isActive ? <Badge variant="destructive">Inactive</Badge> : null}
                  </div>
                  {category.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{category.description}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Can permission={['settings.manage', 'inventory.create', 'inventory.edit']} match="any">
                    <>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          checked={category.isActive}
                          disabled={busy}
                          onCheckedChange={() => void handleToggleActive(category)}
                        />
                        Active
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={busy}
                        aria-label={`Edit ${category.label}`}
                        onClick={() => startEdit(category)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </>
                  </Can>
                  {!category.isSystem ? (
                    <Can permission={['settings.manage', 'inventory.delete']} match="any">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        className="text-destructive"
                        onClick={() => setDeleteTarget(category)}
                      >
                        Delete
                      </Button>
                    </Can>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Archive category?"
          description={`Archive “${deleteTarget?.label ?? ''}”? It moves to the recycle bin. If active products use it, deactivate it instead.`}
          confirmLabel="Archive category"
          destructive
          loading={busy}
          onConfirm={() => (deleteTarget ? handleDelete(deleteTarget) : undefined)}
        />
      </div>
    </PageShell>
  );
}

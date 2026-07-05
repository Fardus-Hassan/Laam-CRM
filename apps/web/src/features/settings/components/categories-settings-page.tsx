'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { OrgCategory, OrgCategoryKind } from '@laam/types';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormTextarea } from '@/components/form/form-textarea';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_GRID_GAP,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import {
  ORG_CATEGORY_KIND_LABELS,
} from '@/features/settings/data/mock-org-category-seeds';
import {
  deleteOrgCategory,
  getOrgCategories,
  ORG_CATEGORIES_CHANGED,
  setOrgCategoryActive,
  upsertOrgCategory,
} from '@/features/settings/data/org-categories-store';
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
  const [categories, setCategories] = React.useState<OrgCategory[]>(() => getOrgCategories('product'));
  const [draft, setDraft] = React.useState({
    label: '',
    slug: '',
    description: '',
  });

  React.useEffect(() => {
    function refresh() {
      setCategories(getOrgCategories(activeKind));
    }
    window.addEventListener(ORG_CATEGORIES_CHANGED, refresh);
    return () => window.removeEventListener(ORG_CATEGORIES_CHANGED, refresh);
  }, [activeKind]);

  React.useEffect(() => {
    setCategories(getOrgCategories(activeKind));
    setDraft({ label: '', slug: '', description: '' });
  }, [activeKind]);

  function handleAdd() {
    if (!draft.label.trim()) {
      toast.error('Label is required');
      return;
    }

    const slug = (draft.slug.trim() || draft.label).replace(/\s+/g, '_').toLowerCase();
    if (categories.some((item) => item.slug === slug)) {
      toast.error('A category with this slug already exists');
      return;
    }

    try {
      upsertOrgCategory({
        kind: activeKind,
        slug,
        label: draft.label.trim(),
        description: draft.description.trim() || undefined,
        sortOrder: categories.length,
        isActive: true,
        isSystem: false,
      });
      setCategories(getOrgCategories(activeKind));
      setDraft({ label: '', slug: '', description: '' });
      toast.success('Category created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create category');
    }
  }

  function handleToggleActive(category: OrgCategory) {
    try {
      setOrgCategoryActive(category.kind, category.slug, !category.isActive);
      setCategories(getOrgCategories(activeKind));
      toast.success(category.isActive ? 'Category deactivated' : 'Category activated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    }
  }

  function handleDelete(category: OrgCategory) {
    if (category.isSystem) {
      toast.error('System categories cannot be deleted');
      return;
    }

    try {
      deleteOrgCategory(category.kind, category.slug);
      setCategories(getOrgCategories(activeKind));
      toast.success('Category removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    }
  }

  return (
    <PageShell
      title="Categories"
      description="Org-specific categories for products, accounting, and knowledge — like a real multi-tenant CRM."
    >
      <div className="space-y-4">
        <p className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Categories are scoped to your organization. System categories (marked below) power automations
          and cannot be deleted — deactivate only. Custom categories persist in this browser for the demo;
          Phase 2 saves to database per tenant.{' '}
          <Link href="/dashboard/accounting/chart-of-accounts" className="font-medium text-primary hover:underline">
            Manage chart of accounts
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

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Add {ORG_CATEGORY_KIND_LABELS[activeKind].toLowerCase()}</CardTitle>
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
                onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
                placeholder={activeKind === 'product' ? 'Spices' : 'Office supplies'}
              />
            </FormField>
            <FormField label="Slug (optional)">
              <FormInput
                value={draft.slug}
                onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))}
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
                placeholder={TAB_HINTS[activeKind]}
              />
            </FormField>
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <Button type="button" onClick={handleAdd}>
                Add category
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">
              {ORG_CATEGORY_KIND_LABELS[activeKind]} ({categories.length})
            </CardTitle>
          </CardHeader>
          <CardContent className={ORDER_SECTION_BODY_CLASS}>
            <p className="mb-3 text-xs text-muted-foreground">{TAB_HINTS[activeKind]}</p>
            <div className="overflow-x-auto rounded-lg border border-border/70">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Label</th>
                    <th className="px-3 py-2 font-medium">Slug</th>
                    <th className="px-3 py-2 font-medium">Active</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2.5 font-medium">{category.label}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{category.slug}</td>
                      <td className="px-3 py-2.5">
                        <Checkbox
                          checked={category.isActive}
                          onCheckedChange={() => handleToggleActive(category)}
                          aria-label={`Toggle ${category.label}`}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        {category.isSystem ? (
                          <Badge variant="secondary" className="text-[10px]">
                            System
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Custom
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {!category.isSystem ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(category)}
                          >
                            Delete
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

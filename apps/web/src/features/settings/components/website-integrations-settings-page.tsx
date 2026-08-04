'use client';

import * as React from 'react';
import Link from 'next/link';
import type { WebsitePlatform, WebsiteStore } from '@laam/types';
import { ArrowLeft, Copy, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import {
  websiteIngestPaths,
  websiteSettingsApi,
} from '@/features/settings/api/website-settings-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function WebsiteIntegrationsSettingsPage() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [stores, setStores] = React.useState<WebsiteStore[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [revealedToken, setRevealedToken] = React.useState<{
    storeId: string;
    token: string;
  } | null>(null);

  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [platform, setPlatform] = React.useState<WebsitePlatform>('woocommerce');
  const [storeUrl, setStoreUrl] = React.useState('');

  const paths = websiteIngestPaths();
  const apiBase =
    typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api').replace(/\/$/, '')
      : '';

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await websiteSettingsApi.list();
      setStores(list);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load websites');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate() {
    if (!name.trim() || !slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }
    setSaving(true);
    try {
      const created = await websiteSettingsApi.create({
        name: name.trim(),
        slug: slug.trim(),
        platform,
        enabled: true,
        storeUrl: storeUrl.trim() || undefined,
      });
      setStores((prev) => [...prev, created]);
      if (created.ingestToken) {
        setRevealedToken({ storeId: created.id, token: created.ingestToken });
      }
      setName('');
      setSlug('');
      setStoreUrl('');
      toast.success('Website connected — copy the ingest token now');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create store');
    } finally {
      setSaving(false);
    }
  }

  async function handleRotate(id: string) {
    try {
      const updated = await websiteSettingsApi.rotateToken(id);
      setStores((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      if (updated.ingestToken) {
        setRevealedToken({ storeId: id, token: updated.ingestToken });
      }
      toast.success('Token rotated — copy the new token');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Rotate failed');
    }
  }

  async function handleToggle(store: WebsiteStore) {
    try {
      const updated = await websiteSettingsApi.update(store.id, { enabled: !store.enabled });
      setStores((prev) => prev.map((s) => (s.id === store.id ? updated : s)));
      toast.success(updated.enabled ? 'Enabled' : 'Disabled');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Disconnect this website?',
      description: 'Ingest will stop immediately.',
      confirmLabel: 'Disconnect',
      destructive: true,
    });
    if (!ok) return;
    try {
      await websiteSettingsApi.disconnect(id);
      setStores((prev) => prev.filter((s) => s.id !== id));
      if (revealedToken?.storeId === id) setRevealedToken(null);
      toast.success('Disconnected');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    }
  }

  function copy(text: string, label: string) {
    void navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }

  return (
    <PageShell
      title="Website / E-commerce"
      description="Connect WooCommerce or custom shops. Orders ingest via secure token (industry-standard webhook hub)."
    >
      <div className={ORDER_PAGE_GAP}>
        <Button type="button" size="sm" variant="ghost" className="w-fit px-0" asChild>
          <Link href="/dashboard/settings/integrations">
            <ArrowLeft className="size-4" />
            Integrations
          </Link>
        </Button>

        {revealedToken ? (
          <Card className={cn(ORDER_CARD_CLASS, 'border-primary/40')}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Ingest token (shown once)</CardTitle>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-2')}>
              <p className="text-xs text-muted-foreground">
                Copy and store securely. It will not be shown again — rotate to get a new one.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="max-w-full break-all rounded-md bg-muted px-2 py-1 text-xs">
                  {revealedToken.token}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copy(revealedToken.token, 'Token')}
                >
                  <Copy className="size-3.5" />
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Connected stores</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
                <RefreshCw className="size-3.5" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !stores.length ? (
              <p className="text-sm text-muted-foreground">
                No stores yet — create one below (WooCommerce or custom).
              </p>
            ) : (
              <ul className="space-y-3">
                {stores.map((store) => (
                  <li
                    key={store.id}
                    className="rounded-lg border px-3 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{store.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {store.platform}
                          </Badge>
                          <Badge
                            variant={store.enabled ? 'success' : 'secondary'}
                            className="text-[10px]"
                          >
                            {store.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          slug: {store.slug}
                          {store.storeUrl ? ` · ${store.storeUrl}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last ingest:{' '}
                          {store.lastIngestAt
                            ? new Date(store.lastIngestAt).toLocaleString()
                            : '—'}
                          {store.lastError ? ` · Error: ${store.lastError}` : ''}
                        </p>
                      </div>
                      <Can permission="settings.manage">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleToggle(store)}
                          >
                            {store.enabled ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleRotate(store.id)}
                          >
                            Rotate token
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => void handleDelete(store.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </Can>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Can permission="settings.manage">
          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Add store</CardTitle>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'grid gap-3 sm:grid-cols-2')}>
              <FormField label="Name" required>
                <FormInput
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug || slug === slugify(name)) setSlug(slugify(e.target.value));
                  }}
                  placeholder="Laam Shop"
                />
              </FormField>
              <FormField label="Slug" required hint="Lowercase kebab-case, unique per org">
                <FormInput
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="laam-shop"
                />
              </FormField>
              <FormField label="Platform">
                <FormSelect
                  value={platform}
                  onChange={(v) => setPlatform(v as WebsitePlatform)}
                  options={[
                    { value: 'woocommerce', label: 'WooCommerce (WordPress)' },
                    { value: 'custom', label: 'Custom coded site' },
                  ]}
                  searchable={false}
                />
              </FormField>
              <FormField label="Store URL" hint="Optional">
                <FormInput
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="https://laambd.shop"
                />
              </FormField>
              <div className="sm:col-span-2">
                <Button type="button" disabled={saving} onClick={() => void handleCreate()}>
                  <Plus className="size-4" />
                  {saving ? 'Creating…' : 'Create & generate token'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </Can>

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">How to connect</CardTitle>
          </CardHeader>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3 text-sm')}>
            <div className="space-y-1">
              <p className="font-medium">WooCommerce</p>
              <p className="text-xs text-muted-foreground">
                WooCommerce → Settings → Advanced → Webhooks → Add webhook.
                Topic: Order created. Delivery URL:
              </p>
              <code className="block break-all rounded-md bg-muted px-2 py-1 text-[11px]">
                {apiBase}
                {paths.woocommerce}?token=YOUR_INGEST_TOKEN
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  copy(`${apiBase}${paths.woocommerce}?token=YOUR_INGEST_TOKEN`, 'Woo URL')
                }
              >
                <Copy className="size-3.5" />
                Copy Woo URL template
              </Button>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Custom site</p>
              <p className="text-xs text-muted-foreground">
                POST JSON to the canonical ingest endpoint with header{' '}
                <code className="text-[11px]">X-Laam-Ingest-Token</code>:
              </p>
              <code className="block break-all rounded-md bg-muted px-2 py-1 text-[11px]">
                POST {apiBase}
                {paths.canonical}
              </code>
              <p className="text-xs text-muted-foreground">
                Body: externalOrderId, customerName, customerPhone, shippingAddress, lineItems
                (sku, productName, quantity, unitPrice). Same order id twice = idempotent
                (no duplicate).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      {confirmDialog}
    </PageShell>
  );
}

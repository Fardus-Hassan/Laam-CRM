'use client';

import * as React from 'react';
import Link from 'next/link';
import type { WebsiteIngestConfig, WebsitePlatform, WebsiteStore } from '@laam/types';
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
import { websiteSettingsApi } from '@/features/settings/api/website-settings-api';
import { WebsiteIntegrationApiGuide } from '@/features/settings/components/website-integration-api-guide';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatDateTime } from '@/lib/format';
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
  const [savingIngest, setSavingIngest] = React.useState(false);
  const [ingestConfig, setIngestConfig] = React.useState<WebsiteIngestConfig>({
    duplicateMatchWindowValue: 60,
    duplicateMatchWindowUnit: 'minutes',
  });
  const [revealedToken, setRevealedToken] = React.useState<{
    storeId: string;
    token: string;
  } | null>(null);
  const [revealedWebhookSecret, setRevealedWebhookSecret] = React.useState<{
    storeId: string;
    secret: string;
  } | null>(null);

  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [platform, setPlatform] = React.useState<WebsitePlatform>('woocommerce');
  const [storeUrl, setStoreUrl] = React.useState('');

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [list, config] = await Promise.all([
        websiteSettingsApi.list(),
        websiteSettingsApi.getIngestConfig().catch(() => null),
      ]);
      setStores(list);
      if (config) setIngestConfig(config);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load websites');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleSaveIngestConfig() {
    const value = Math.floor(Number(ingestConfig.duplicateMatchWindowValue) || 0);
    if (value < 1) {
      toast.error('Match window must be at least 1');
      return;
    }
    setSavingIngest(true);
    try {
      const saved = await websiteSettingsApi.updateIngestConfig({
        duplicateMatchWindowValue: value,
        duplicateMatchWindowUnit: ingestConfig.duplicateMatchWindowUnit,
      });
      setIngestConfig(saved);
      toast.success('Ingest match window saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save ingest settings');
    } finally {
      setSavingIngest(false);
    }
  }

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
      if (created.wooWebhookSecret) {
        setRevealedWebhookSecret({
          storeId: created.id,
          secret: created.wooWebhookSecret,
        });
      }
      setName('');
      setSlug('');
      setStoreUrl('');
      toast.success(
        created.wooWebhookSecret
          ? 'Website connected — copy ingest token + Woo webhook secret now'
          : 'Website connected — copy the ingest token now',
      );
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

  async function handleRotateWebhookSecret(id: string) {
    const ok = await confirm({
      title: 'Rotate Woo webhook secret?',
      description:
        'Update the new secret in your WooCommerce webhook “Secret” field or signatures will fail.',
      confirmLabel: 'Rotate secret',
      destructive: true,
    });
    if (!ok) return;
    try {
      const updated = await websiteSettingsApi.rotateWebhookSecret(id);
      setStores((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      if (updated.wooWebhookSecret) {
        setRevealedWebhookSecret({ storeId: id, secret: updated.wooWebhookSecret });
      }
      toast.success('Webhook secret rotated — copy and paste into WooCommerce');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Rotate webhook secret failed');
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
      if (revealedWebhookSecret?.storeId === id) setRevealedWebhookSecret(null);
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
      description="Connect WooCommerce or custom shops. Orders ingest via secure token — full API body and step-by-step guide below."
    >
      <div className={ORDER_PAGE_GAP}>
        <Button type="button" size="sm" variant="ghost" className="w-fit px-0" asChild>
          <Link href="/dashboard/settings/integrations">
            <ArrowLeft className="size-4" />
            Integrations
          </Link>
        </Button>

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Duplicate match window</CardTitle>
          </CardHeader>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
            <p className="text-xs text-muted-foreground">
              Same phone + same cart within this window links Woo submit to an existing Incomplete /
              Confirmed order (no second Pending row, no double call). Default 60 minutes.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <FormField label="Value" className="w-28">
                <FormInput
                  type="number"
                  min={1}
                  max={10080}
                  value={ingestConfig.duplicateMatchWindowValue}
                  onChange={(e) =>
                    setIngestConfig((prev) => ({
                      ...prev,
                      duplicateMatchWindowValue: Number(e.target.value) || 1,
                    }))
                  }
                />
              </FormField>
              <FormField label="Unit" className="w-36">
                <FormSelect
                  value={ingestConfig.duplicateMatchWindowUnit}
                  onChange={(v) =>
                    setIngestConfig((prev) => ({
                      ...prev,
                      duplicateMatchWindowUnit: v as 'minutes' | 'hours',
                    }))
                  }
                  options={[
                    { value: 'minutes', label: 'Minutes' },
                    { value: 'hours', label: 'Hours' },
                  ]}
                  searchable={false}
                />
              </FormField>
              <Can permission="settings.manage">
                <Button
                  type="button"
                  size="sm"
                  disabled={savingIngest}
                  onClick={() => void handleSaveIngestConfig()}
                >
                  {savingIngest ? 'Saving…' : 'Save'}
                </Button>
              </Can>
            </div>
          </CardContent>
        </Card>

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

        {revealedWebhookSecret ? (
          <Card className={cn(ORDER_CARD_CLASS, 'border-amber-500/40')}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Woo webhook secret (shown once)</CardTitle>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-2')}>
              <p className="text-xs text-muted-foreground">
                Paste this into WooCommerce webhook field <strong className="text-foreground">Secret</strong>.
                CRM verifies <code className="rounded bg-muted px-1 font-mono text-[11px]">X-WC-Webhook-Signature</code>.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="max-w-full break-all rounded-md bg-muted px-2 py-1 text-xs">
                  {revealedWebhookSecret.secret}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copy(revealedWebhookSecret.secret, 'Webhook secret')}
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
                            ? formatDateTime(store.lastIngestAt)
                            : '—'}
                          {store.lastError ? ` · Error: ${store.lastError}` : ''}
                        </p>
                        {store.platform === 'woocommerce' ? (
                          <p className="text-xs text-muted-foreground">
                            Webhook HMAC:{' '}
                            {store.hasWooWebhookSecret ? (
                              <span className="text-foreground">configured</span>
                            ) : (
                              <span className="text-amber-700 dark:text-amber-400">
                                missing — rotate secret
                              </span>
                            )}
                          </p>
                        ) : null}
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
                          {store.platform === 'woocommerce' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void handleRotateWebhookSecret(store.id)}
                            >
                              Rotate webhook secret
                            </Button>
                          ) : null}
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

        <WebsiteIntegrationApiGuide />
      </div>
      {confirmDialog}
    </PageShell>
  );
}

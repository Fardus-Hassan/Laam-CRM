'use client';

import * as React from 'react';
import Link from 'next/link';
import type { CarrybeeIntegrationSettings, CourierStatusMap } from '@laam/types';
import { ArrowLeft, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  carrybeeSettingsApi,
  type CarrybeeStoreOption,
} from '@/features/settings/api/carrybee-settings-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export function CarrybeeIntegrationSettingsPage() {
  const [settings, setSettings] = React.useState<CarrybeeIntegrationSettings | null>(null);
  const [stores, setStores] = React.useState<CarrybeeStoreOption[]>([]);
  const [statusMaps, setStatusMaps] = React.useState<CourierStatusMap[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [enabled, setEnabled] = React.useState(false);
  const [environment, setEnvironment] = React.useState<'sandbox' | 'live'>('sandbox');
  const [storeId, setStoreId] = React.useState('');
  const [clientId, setClientId] = React.useState('');
  const [clientSecret, setClientSecret] = React.useState('');
  const [clientContext, setClientContext] = React.useState('');
  const [syncIntervalSec, setSyncIntervalSec] = React.useState('180');

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, maps] = await Promise.all([
        carrybeeSettingsApi.get(),
        carrybeeSettingsApi.listStatusMaps(),
      ]);
      setSettings(cfg);
      setStatusMaps(maps);
      setEnabled(cfg.enabled);
      setEnvironment(cfg.environment);
      setStoreId(cfg.storeId ?? '');
      setSyncIntervalSec(String(cfg.syncIntervalSec || 180));
      setClientId('');
      setClientSecret('');
      setClientContext('');
      if (cfg.hasCredentials && cfg.enabled) {
        try {
          const list = await carrybeeSettingsApi.listStores();
          setStores(list);
        } catch (err) {
          setStores([]);
          toast.error(
            err instanceof Error
              ? err.message
              : 'Could not load stores — click Test connection',
          );
        }
      } else {
        setStores([]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load Carrybee settings');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await carrybeeSettingsApi.save({
        enabled,
        environment,
        storeId: storeId || null,
        syncIntervalSec: Number(syncIntervalSec) || 180,
        ...(clientId.trim() ? { clientId: clientId.trim() } : {}),
        ...(clientSecret.trim() ? { clientSecret: clientSecret.trim() } : {}),
        ...(clientContext.trim() ? { clientContext: clientContext.trim() } : {}),
      });
      setSettings(saved);
      toast.success('Carrybee settings saved');
      if (saved.enabled && saved.hasCredentials) {
        try {
          const list = await carrybeeSettingsApi.listStores();
          setStores(list);
          if (!storeId && list[0]) {
            setStoreId(String(list[0].id));
            toast.message(`Store list loaded — select one (suggested: ${list[0].name})`);
          }
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : 'Saved, but store list failed — use Test connection',
          );
        }
      }
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    try {
      const result = await carrybeeSettingsApi.test();
      toast.success(`Connected — ${result.storeCount} stores found`);
      const list = await carrybeeSettingsApi.listStores();
      setStores(list);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Connection test failed');
    }
  }

  async function handleDisconnect() {
    try {
      await carrybeeSettingsApi.disconnect();
      toast.success('Carrybee disconnected');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Disconnect failed');
    }
  }

  async function toggleStatusMap(row: CourierStatusMap) {
    try {
      const updated = await carrybeeSettingsApi.upsertStatusMap({
        id: row.id,
        provider: 'carrybee',
        slug: row.slug,
        label: row.label,
        crmStatus: row.crmStatus,
        isTerminal: row.isTerminal,
        sortOrder: row.sortOrder,
        isActive: !row.isActive,
      });
      setStatusMaps((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    }
  }

  return (
    <PageShell
      title="Carrybee"
      description="Per-organization courier credentials, store, status sync, and CRM status map."
      breadcrumbs={[
        { label: 'Settings', href: '/dashboard/settings' },
        { label: 'Integrations', href: '/dashboard/settings/integrations' },
        { label: 'Carrybee' },
      ]}
    >
      <div className={ORDER_PAGE_GAP}>
        <Button type="button" variant="ghost" size="sm" className="w-fit px-2" asChild>
          <Link href="/dashboard/settings/integrations">
            <ArrowLeft className="size-4" />
            Integrations
          </Link>
        </Button>

        {loading || !settings ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">Connection</CardTitle>
              </CardHeader>
              <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4')}>
                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Enable Carrybee</p>
                    <p className="text-xs text-muted-foreground">
                      Book + status sync use these org credentials (not only .env).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Environment">
                    <FormSelect
                      value={environment}
                      onChange={(v) => setEnvironment(v as 'sandbox' | 'live')}
                      options={[
                        { value: 'sandbox', label: 'Sandbox' },
                        { value: 'live', label: 'Live' },
                      ]}
                    />
                  </FormField>
                  <FormField label="Sync interval (seconds)">
                    <FormInput
                      value={syncIntervalSec}
                      onChange={(e) => setSyncIntervalSec(e.target.value)}
                      placeholder="180"
                    />
                  </FormField>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    label="Client ID"
                    hint={settings.clientIdMasked ? `Saved: ${settings.clientIdMasked}` : 'Required'}
                  >
                    <FormInput
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder={settings.hasCredentials ? 'Leave blank to keep' : 'Carrybee client id'}
                    />
                  </FormField>
                  <FormField label="Client secret">
                    <FormInput
                      type="password"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      placeholder={settings.hasCredentials ? 'Leave blank to keep' : 'Client secret'}
                    />
                  </FormField>
                  <FormField
                    label="Client context"
                    hint={
                      settings.clientContextMasked
                        ? `Saved: ${settings.clientContextMasked}`
                        : 'Required'
                    }
                  >
                    <FormInput
                      value={clientContext}
                      onChange={(e) => setClientContext(e.target.value)}
                      placeholder={
                        settings.hasCredentials ? 'Leave blank to keep' : 'Carrybee client context'
                      }
                    />
                  </FormField>
                </div>

                <FormField
                  label="Store"
                  hint={
                    stores.length
                      ? 'Pick from Carrybee stores, or type store ID below'
                      : 'Click Test connection to load stores, or type store ID manually'
                  }
                >
                  <FormSelect
                    value={storeId}
                    onChange={setStoreId}
                    options={[
                      {
                        value: '',
                        label: stores.length ? 'Select store' : 'No stores loaded yet',
                      },
                      ...stores.map((s) => ({
                        value: String(s.id),
                        label: `${s.name} (${s.id})`,
                      })),
                    ]}
                    placeholder="Select store"
                  />
                </FormField>
                <FormField
                  label="Store ID (manual)"
                  hint="Live store 20902 is production — use sandbox store ID when Environment=Sandbox"
                >
                  <FormInput
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value.trim())}
                    placeholder="e.g. sandbox store id"
                  />
                </FormField>

                {settings.lastError ? (
                  <p className="text-sm text-muted-foreground">
                    Last sync note: <span className="text-destructive">{settings.lastError}</span>
                    {' '}(connection can still be OK — usually a missing courier consignment)
                  </p>
                ) : null}
                {settings.lastSyncAt ? (
                  <p className="text-xs text-muted-foreground">
                    Last sync: {formatDateTime(settings.lastSyncAt)}
                  </p>
                ) : null}

                <Can permission="settings.manage">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                      <Save className="size-3.5" />
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!settings.hasCredentials && !clientId}
                      onClick={() => void handleTest()}
                    >
                      <RefreshCw className="size-3.5" />
                      Test connection
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void handleDisconnect()}>
                      Disconnect
                    </Button>
                  </div>
                </Can>
              </CardContent>
            </Card>

            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">Courier status → CRM map</CardTitle>
              </CardHeader>
              <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-2')}>
                <p className="text-xs text-muted-foreground">
                  Sync maps Carrybee status to CRM status when active (e.g. returned → rts_carrybee).
                </p>
                <div className="max-h-80 overflow-auto rounded-md border">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-muted/80 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">Label</th>
                        <th className="px-2 py-1.5 font-medium">CRM</th>
                        <th className="px-2 py-1.5 font-medium">Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statusMaps.map((row) => (
                        <tr key={row.id} className="border-t">
                          <td className="px-2 py-1.5">{row.label}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {row.crmStatus ?? '—'}
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="checkbox"
                              className="size-4"
                              checked={row.isActive}
                              onChange={() => void toggleStatusMap(row)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
}

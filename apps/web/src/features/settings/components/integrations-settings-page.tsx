'use client';

import * as React from 'react';
import type { IntegrationConfig } from '@laam/types';
import { CheckCircle2, Link2, Plug, Unplug, XCircle } from 'lucide-react';

import { Can } from '@/components/auth/can';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { orgSettingsApi } from '@/features/settings/api/org-settings-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary'; icon: React.ComponentType<{ className?: string }> }> = {
  connected: { label: 'Connected', variant: 'success', icon: CheckCircle2 },
  disconnected: { label: 'Not connected', variant: 'secondary', icon: Unplug },
  pending: { label: 'Pending', variant: 'warning', icon: Link2 },
  error: { label: 'Error', variant: 'destructive', icon: XCircle },
};

const PROVIDER_ICONS: Record<string, string> = {
  steadfast: '🚚',
  pathao: '📦',
  redx: '🔴',
  facebook: '📘',
  bkash: '💳',
  nagad: '🟠',
  smtp: '✉️',
  woocommerce: '🛒',
};

export function IntegrationsSettingsPage() {
  const [integrations, setIntegrations] = React.useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const settings = await orgSettingsApi.getSettings();
      setIntegrations(settings.integrations);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleConnect(provider: IntegrationConfig['provider']) {
    await orgSettingsApi.updateIntegration({ provider, config: { apiKey: 'demo-key' } });
    await refresh();
  }

  async function handleDisconnect(provider: string) {
    await orgSettingsApi.disconnectIntegration(provider);
    await refresh();
  }

  return (
    <PageShell
      title="Integrations"
      description="Connect couriers, payments, Facebook leads, and email."
    >
      <div className={ORDER_PAGE_GAP}>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {integrations.map((integration) => {
              const status = STATUS_CONFIG[integration.status] ?? STATUS_CONFIG.disconnected;
              const StatusIcon = status.icon;

              return (
                <Card key={integration.id} className={ORDER_CARD_CLASS}>
                  <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{PROVIDER_ICONS[integration.provider] ?? '🔌'}</span>
                        <CardTitle className="text-sm">{integration.label}</CardTitle>
                      </div>
                      <Badge variant={status.variant} className="gap-1 text-[10px]">
                        <StatusIcon className="size-3" />
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
                    {integration.lastSyncAt ? (
                      <p className="text-xs text-muted-foreground">
                        Last sync: {new Date(integration.lastSyncAt).toLocaleString()}
                      </p>
                    ) : null}
                    {integration.errorMessage ? (
                      <p className="text-xs text-destructive">{integration.errorMessage}</p>
                    ) : null}
                    <Can permission="settings.manage">
                      <div className="flex gap-2">
                        {integration.status === 'connected' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleDisconnect(integration.provider)}
                          >
                            <Unplug className="size-4" />
                            Disconnect
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleConnect(integration.provider)}
                          >
                            <Plug className="size-4" />
                            Connect
                          </Button>
                        )}
                        {integration.status === 'connected' ? (
                          <Button type="button" size="sm" variant="ghost">Configure</Button>
                        ) : null}
                      </div>
                    </Can>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}

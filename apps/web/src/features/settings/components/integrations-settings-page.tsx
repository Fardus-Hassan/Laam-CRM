'use client';

import * as React from 'react';
import Link from 'next/link';
import type { PathaoIntegrationSettings } from '@laam/types';
import { CheckCircle2, Plug, Unplug, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { pathaoSettingsApi } from '@/features/settings/api/pathao-settings-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

const COMING_SOON = [
  { id: 'steadfast', label: 'Steadfast Courier', icon: '🚚' },
  { id: 'carrybee', label: 'CarryBee Courier', icon: '📦' },
  { id: 'redx', label: 'RedX Courier', icon: '🔴' },
  { id: 'bkash', label: 'bKash Payment', icon: '💳' },
  { id: 'smtp', label: 'Email (SMTP)', icon: '✉️' },
] as const;

export function IntegrationsSettingsPage() {
  const [pathao, setPathao] = React.useState<PathaoIntegrationSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cfg = await pathaoSettingsApi.get();
      setPathao(cfg);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load Pathao settings';
      setError(message);
      setPathao(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const pathaoConnected = Boolean(pathao?.enabled && pathao.hasCredentials);
  const pathaoStatus = pathao?.lastError
    ? 'error'
    : pathaoConnected
      ? 'connected'
      : 'disconnected';

  return (
    <PageShell
      title="Integrations"
      description="Connect couriers and other services. Credentials are stored per organization."
    >
      <div className={ORDER_PAGE_GAP}>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📦</span>
                    <CardTitle className="text-sm">Pathao Courier</CardTitle>
                  </div>
                  <Badge
                    variant={
                      pathaoStatus === 'connected'
                        ? 'success'
                        : pathaoStatus === 'error'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className="gap-1 text-[10px]"
                  >
                    {pathaoStatus === 'connected' ? (
                      <CheckCircle2 className="size-3" />
                    ) : pathaoStatus === 'error' ? (
                      <XCircle className="size-3" />
                    ) : (
                      <Unplug className="size-3" />
                    )}
                    {pathaoStatus === 'connected'
                      ? 'Connected'
                      : pathaoStatus === 'error'
                        ? 'Error'
                        : 'Not connected'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
                <p className="text-xs text-muted-foreground">
                  Book parcels, sync courier status, and map Pathao → CRM status from org
                  settings.
                </p>
                {pathao?.environment ? (
                  <p className="text-xs text-muted-foreground">
                    Environment: <span className="font-medium">{pathao.environment}</span>
                    {pathao.storeId ? ` · Store ${pathao.storeId}` : ''}
                  </p>
                ) : null}
                {pathao?.lastSyncAt ? (
                  <p className="text-xs text-muted-foreground">
                    Last sync: {new Date(pathao.lastSyncAt).toLocaleString()}
                  </p>
                ) : null}
                {pathao?.lastError || error ? (
                  <p className="text-xs text-destructive">{pathao?.lastError || error}</p>
                ) : null}
                <Can permission="settings.manage">
                  <Button type="button" size="sm" asChild>
                    <Link href="/dashboard/settings/integrations/pathao">
                      <Plug className="size-3.5" />
                      Configure Pathao
                    </Link>
                  </Button>
                </Can>
              </CardContent>
            </Card>

            {COMING_SOON.map((item) => (
              <Card key={item.id} className={ORDER_CARD_CLASS}>
                <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <CardTitle className="text-sm">{item.label}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      Coming soon
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className={ORDER_SECTION_BODY_CLASS}>
                  <p className="text-xs text-muted-foreground">
                    Not configured yet. Pathao is available now.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import type {
  CarrybeeIntegrationSettings,
  PathaoIntegrationSettings,
  SmsIntegrationSettings,
} from '@laam/types';
import { CheckCircle2, Plug, Unplug, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { carrybeeSettingsApi } from '@/features/settings/api/carrybee-settings-api';
import { pathaoSettingsApi } from '@/features/settings/api/pathao-settings-api';
import { smsSettingsApi } from '@/features/settings/api/sms-settings-api';
import { websiteSettingsApi } from '@/features/settings/api/website-settings-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

const COMING_SOON = [
  { id: 'bkash', label: 'bKash Payment', icon: '💳' },
  { id: 'smtp', label: 'Email (SMTP)', icon: '✉️' },
] as const;

function statusOf(cfg: { enabled?: boolean; hasCredentials?: boolean; lastError?: string | null } | null) {
  if (cfg?.lastError) return 'error' as const;
  if (cfg?.enabled && cfg.hasCredentials) return 'connected' as const;
  return 'disconnected' as const;
}

function websiteHubStatus(
  stores: Array<{ enabled: boolean; lastError: string | null }> | null,
): 'connected' | 'error' | 'disconnected' {
  if (!stores?.length) return 'disconnected';
  if (stores.some((s) => s.lastError)) return 'error';
  if (stores.some((s) => s.enabled)) return 'connected';
  return 'disconnected';
}

function StatusBadge({ status }: { status: 'connected' | 'error' | 'disconnected' }) {
  return (
    <Badge
      variant={
        status === 'connected' ? 'success' : status === 'error' ? 'destructive' : 'secondary'
      }
      className="gap-1 text-[10px]"
    >
      {status === 'connected' ? (
        <CheckCircle2 className="size-3" />
      ) : status === 'error' ? (
        <XCircle className="size-3" />
      ) : (
        <Unplug className="size-3" />
      )}
      {status === 'connected' ? 'Connected' : status === 'error' ? 'Error' : 'Not connected'}
    </Badge>
  );
}

export function IntegrationsSettingsPage() {
  const [pathao, setPathao] = React.useState<PathaoIntegrationSettings | null>(null);
  const [carrybee, setCarrybee] = React.useState<CarrybeeIntegrationSettings | null>(null);
  const [sms, setSms] = React.useState<SmsIntegrationSettings | null>(null);
  const [websitesConnected, setWebsitesConnected] = React.useState(0);
  const [websiteStatus, setWebsiteStatus] = React.useState<
    'connected' | 'error' | 'disconnected'
  >('disconnected');
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, s, websites] = await Promise.all([
        pathaoSettingsApi.get().catch(() => null),
        carrybeeSettingsApi.get().catch(() => null),
        smsSettingsApi.get().catch(() => null),
        websiteSettingsApi.list().catch(() => null),
      ]);
      setPathao(p);
      setCarrybee(c);
      setSms(s);
      setWebsitesConnected(websites?.filter((w) => w.enabled).length ?? 0);
      setWebsiteStatus(websiteHubStatus(websites));
      if (!p && !c && !s && !websites) toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const pathaoStatus = statusOf(pathao);
  const carrybeeStatus = statusOf(carrybee);
  const smsStatus = statusOf(sms);

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
                  <StatusBadge status={pathaoStatus} />
                </div>
              </CardHeader>
              <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
                <p className="text-xs text-muted-foreground">
                  Book parcels, sync courier status, and map Pathao → CRM status.
                </p>
                {pathao?.environment ? (
                  <p className="text-xs text-muted-foreground">
                    Environment: <span className="font-medium">{pathao.environment}</span>
                    {pathao.storeId ? ` · Store ${pathao.storeId}` : ''}
                  </p>
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

            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📦</span>
                    <CardTitle className="text-sm">Carrybee Courier</CardTitle>
                  </div>
                  <StatusBadge status={carrybeeStatus} />
                </div>
              </CardHeader>
              <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
                <p className="text-xs text-muted-foreground">
                  Book parcels, sync status, and map Carrybee → CRM (incl. RTS Carrybee).
                </p>
                {carrybee?.environment ? (
                  <p className="text-xs text-muted-foreground">
                    Environment: <span className="font-medium">{carrybee.environment}</span>
                    {carrybee.storeId ? ` · Store ${carrybee.storeId}` : ''}
                  </p>
                ) : null}
                <Can permission="settings.manage">
                  <Button type="button" size="sm" asChild>
                    <Link href="/dashboard/settings/integrations/carrybee">
                      <Plug className="size-3.5" />
                      Configure Carrybee
                    </Link>
                  </Button>
                </Can>
              </CardContent>
            </Card>

            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💬</span>
                    <CardTitle className="text-sm">SMS Gateway</CardTitle>
                  </div>
                  <StatusBadge status={smsStatus} />
                </div>
              </CardHeader>
              <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
                <p className="text-xs text-muted-foreground">
                  Custom HTTP SMS (Gennet / SSL / any). Send from order detail &amp; bulk actions.
                </p>
                <Can permission="settings.manage">
                  <Button type="button" size="sm" asChild>
                    <Link href="/dashboard/settings/integrations/sms">
                      <Plug className="size-3.5" />
                      Configure SMS
                    </Link>
                  </Button>
                </Can>
              </CardContent>
            </Card>

            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🛒</span>
                    <CardTitle className="text-sm">Website / E-commerce</CardTitle>
                  </div>
                  <StatusBadge status={websiteStatus} />
                </div>
              </CardHeader>
              <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
                <p className="text-xs text-muted-foreground">
                  WooCommerce + custom sites → CRM orders via secure ingest token (idempotent).
                </p>
                {websitesConnected > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {websitesConnected} enabled store{websitesConnected === 1 ? '' : 's'}
                  </p>
                ) : null}
                <Can permission="settings.manage">
                  <Button type="button" size="sm" asChild>
                    <Link href="/dashboard/settings/integrations/websites">
                      <Plug className="size-3.5" />
                      Configure websites
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
                  <p className="text-xs text-muted-foreground">Not configured yet.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import type { BdCourierIntegrationSettings, BdCourierPlan } from '@laam/types';
import { ArrowLeft, RefreshCw, Save, Unplug } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { bdCourierSettingsApi } from '@/features/settings/api/bdcourier-settings-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

export function BdCourierIntegrationSettingsPage() {
  const [settings, setSettings] = React.useState<BdCourierIntegrationSettings | null>(null);
  const [plan, setPlan] = React.useState<BdCourierPlan | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [planLoading, setPlanLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [enabled, setEnabled] = React.useState(true);
  const [apiKey, setApiKey] = React.useState('');

  const loadPlan = React.useCallback(async (hasCredentials: boolean) => {
    if (!hasCredentials) {
      setPlan(null);
      return;
    }
    setPlanLoading(true);
    try {
      setPlan(await bdCourierSettingsApi.plan());
    } catch (error) {
      setPlan(null);
      toast.error(error instanceof Error ? error.message : 'Failed to load BD Courier plan');
    } finally {
      setPlanLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void bdCourierSettingsApi
      .get()
      .then(async (s) => {
        if (cancelled) return;
        setSettings(s);
        setEnabled(s.enabled);
        setApiKey(s.apiKeyMasked ?? '');
        if (s.hasCredentials) {
          setPlanLoading(true);
          try {
            const p = await bdCourierSettingsApi.plan();
            if (!cancelled) setPlan(p);
          } catch {
            if (!cancelled) setPlan(null);
          } finally {
            if (!cancelled) setPlanLoading(false);
          }
        }
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to load BD Courier settings');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const looksMasked = apiKey.includes('••••');
      const payload: Parameters<typeof bdCourierSettingsApi.save>[0] = { enabled };
      if (!looksMasked && apiKey.trim()) {
        payload.apiKey = apiKey.trim();
      } else if (!settings?.hasCredentials && !apiKey.trim()) {
        toast.error('Enter your BD Courier API key');
        setSaving(false);
        return;
      }

      const saved = await bdCourierSettingsApi.save(payload);
      setSettings(saved);
      setEnabled(saved.enabled);
      setApiKey(saved.apiKeyMasked ?? '');
      toast.success('BD Courier settings saved');
      await loadPlan(saved.hasCredentials);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const result = await bdCourierSettingsApi.test();
      toast.success(result.message || 'Connection OK');
      const refreshed = await bdCourierSettingsApi.get();
      setSettings(refreshed);
      await loadPlan(refreshed.hasCredentials);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  }

  async function handleDisconnect() {
    try {
      const s = await bdCourierSettingsApi.disconnect();
      setSettings(s);
      setEnabled(false);
      setApiKey('');
      setPlan(null);
      toast.success('BD Courier disconnected');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Disconnect failed');
    }
  }

  return (
    <PageShell
      title="BD Courier"
      description="Org-wise API key for phone success-rate & fraud check (Pathao, Steadfast, RedX, CarryBee, Paperfly)."
      breadcrumbs={[
        { label: 'Settings', href: '/dashboard/settings' },
        { label: 'Integrations', href: '/dashboard/settings/integrations' },
        { label: 'BD Courier' },
      ]}
    >
      <div className={ORDER_PAGE_GAP}>
        <Button type="button" variant="ghost" size="sm" className="w-fit px-0" asChild>
          <Link href="/dashboard/settings/integrations">
            <ArrowLeft className="size-3.5" />
            Back to integrations
          </Link>
        </Button>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <BdCourierPlanCard
              plan={plan}
              loading={planLoading}
              hasCredentials={Boolean(settings?.hasCredentials)}
              onRefresh={() => void loadPlan(Boolean(settings?.hasCredentials))}
            />

            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">API credentials</CardTitle>
              </CardHeader>
              <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4')}>
                <p className="text-xs text-muted-foreground">
                  Get your key from{' '}
                  <a
                    href="https://bdcourier.com"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    bdcourier.com
                  </a>
                  . Each organization stores its own encrypted key — never shared across tenants.
                </p>

                <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Enabled</p>
                    <p className="text-[11px] text-muted-foreground">
                      When on, order create / detail use BD Courier for network success
                      rates. Tables show cached results only.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                </label>

                <FormField label="API key" htmlFor="bdcourier-api-key" required>
                  <FormInput
                    id="bdcourier-api-key"
                    type="password"
                    autoComplete="off"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste BD Courier Bearer API key"
                  />
                </FormField>

                {settings?.lastError ? (
                  <p className="text-xs text-destructive">Last error: {settings.lastError}</p>
                ) : settings?.lastSyncAt ? (
                  <p className="text-xs text-muted-foreground">
                    Last OK sync: {new Date(settings.lastSyncAt).toLocaleString()}
                  </p>
                ) : null}

                <Can permission="settings.manage">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={() => void handleSave()}
                    >
                      <Save className="size-3.5" />
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={testing || !settings?.hasCredentials}
                      onClick={() => void handleTest()}
                    >
                      <RefreshCw className={cn('size-3.5', testing && 'animate-spin')} />
                      {testing ? 'Testing…' : 'Test connection'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={!settings?.hasCredentials}
                      onClick={() => void handleDisconnect()}
                    >
                      <Unplug className="size-3.5" />
                      Disconnect
                    </Button>
                  </div>
                </Can>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
}

function BdCourierPlanCard({
  plan,
  loading,
  hasCredentials,
  onRefresh,
}: {
  plan: BdCourierPlan | null;
  loading: boolean;
  hasCredentials: boolean;
  onRefresh: () => void;
}) {
  const active = plan?.hasSubscription && /active/i.test(plan.status);

  const freeUsed = plan ? Math.max(0, (plan.callLimit ?? 0) - (plan.remainingFreeCalls ?? 0)) : 0;
  const freeLimit = plan?.callLimit;
  const paidUsed = plan?.paidCalls ?? 0;
  const paidLimit = plan?.paidLimit;
  const paidRemaining = plan?.remainingPaidCalls;

  return (
    <Card className={ORDER_CARD_CLASS}>
      <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex-row items-center justify-between gap-2')}>
        <CardTitle className="text-sm">Your plan</CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          disabled={!hasCredentials || loading}
          onClick={onRefresh}
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4')}>
        {!hasCredentials ? (
          <p className="text-sm text-muted-foreground">
            Save an API key to load your BD Courier subscription and usage.
          </p>
        ) : loading && !plan ? (
          <div className="grid animate-pulse gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl border bg-muted/40" />
            ))}
          </div>
        ) : !plan ? (
          <p className="text-sm text-muted-foreground">
            Couldn’t load plan. Check the API key or tap Refresh.
          </p>
        ) : !plan.hasSubscription ? (
          <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3">
            <p className="text-sm font-semibold">No active subscription</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Status: {plan.status}. Subscribe on{' '}
              <a
                href="https://bdcourier.com"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                bdcourier.com
              </a>{' '}
              to unlock higher API limits.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold tracking-tight">
                    {plan.planName || 'BD Courier plan'}
                  </p>
                  <span
                    className={cn(
                      'rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize',
                      active
                        ? 'border-primary/30 bg-secondary/50 text-primary'
                        : 'border-border bg-muted/40 text-muted-foreground',
                    )}
                  >
                    {plan.status}
                  </span>
                  {plan.planType ? (
                    <span className="rounded-md border border-border/70 px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                      {plan.planType}
                      {plan.frequency ? ` · ${plan.frequency}` : ''}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.price != null ? `৳${plan.price}` : null}
                  {plan.price != null && plan.frequency ? ` / ${plan.frequency}` : null}
                  {plan.daysRemaining != null
                    ? `${plan.price != null ? ' · ' : ''}${plan.daysRemaining} days remaining`
                    : null}
                  {plan.expiresAt ? ` · expires ${formatPlanDate(plan.expiresAt)}` : null}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PlanStat
                label="API calls used"
                value={String(plan.apiCalls)}
                hint="Total checks counted by BD Courier"
              />
              <PlanStat
                label="Free remaining"
                value={
                  plan.remainingFreeCalls != null
                    ? String(plan.remainingFreeCalls)
                    : freeLimit != null
                      ? String(Math.max(0, freeLimit - freeUsed))
                      : '—'
                }
                hint={freeLimit != null ? `Limit ${freeLimit}` : undefined}
              />
              <PlanStat
                label="Paid remaining"
                value={paidRemaining != null ? String(paidRemaining) : '—'}
                hint={
                  paidLimit != null
                    ? `Used ${paidUsed} / ${paidLimit}`
                    : paidUsed > 0
                      ? `Used ${paidUsed}`
                      : undefined
                }
              />
              <PlanStat
                label="Next due"
                value={plan.nextDueDate ? formatPlanDate(plan.nextDueDate) : '—'}
                hint={plan.expiresAt ? `Expires ${formatPlanDate(plan.expiresAt)}` : undefined}
              />
            </div>

            {(freeLimit != null && freeLimit > 0) || (paidLimit != null && paidLimit > 0) ? (
              <div className="space-y-2">
                {freeLimit != null && freeLimit > 0 ? (
                  <UsageBar
                    label="Free calls"
                    used={Math.min(freeUsed, freeLimit)}
                    limit={freeLimit}
                  />
                ) : null}
                {paidLimit != null && paidLimit > 0 ? (
                  <UsageBar
                    label="Paid calls"
                    used={Math.min(paidUsed, paidLimit)}
                    limit={paidLimit}
                  />
                ) : null}
              </div>
            ) : null}

            <p className="text-[10px] text-muted-foreground">
              Updated {new Date(plan.fetchedAt).toLocaleString()}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PlanStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {used} / {limit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function formatPlanDate(value: string): string {
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

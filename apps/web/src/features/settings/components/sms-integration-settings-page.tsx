'use client';

import * as React from 'react';
import Link from 'next/link';
import type { SmsIntegrationSettings } from '@laam/types';
import { ArrowLeft, RefreshCw, Save, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { FormTextarea } from '@/components/form/form-textarea';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { smsSettingsApi } from '@/features/settings/api/sms-settings-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

const GENNET_DEFAULT_PARAMS =
  'api_token=YOUR_TOKEN&sid=LaamMASK&msisdn=88{mobile_number}&sms={sms_text}&csms_id={unique_id}';

export function SmsIntegrationSettingsPage() {
  const [settings, setSettings] = React.useState<SmsIntegrationSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  const [enabled, setEnabled] = React.useState(false);
  const [apiUrl, setApiUrl] = React.useState('https://isms.gennet.com.bd/api/v3/send-sms');
  const [httpMethod, setHttpMethod] = React.useState<'GET' | 'POST'>('GET');
  const [paramsTemplate, setParamsTemplate] = React.useState(GENNET_DEFAULT_PARAMS);
  const [headersJson, setHeadersJson] = React.useState('');
  const [testPhone, setTestPhone] = React.useState('');
  const [autoSms, setAutoSms] = React.useState(false);
  const [statusMapText, setStatusMapText] = React.useState(
    'confirmed=confirm\nin_courier=in_courier\ndelivered=delivered',
  );
  const [savingAutomation, setSavingAutomation] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void smsSettingsApi
      .get()
      .then((s) => {
        if (cancelled) return;
        setSettings(s);
        setEnabled(s.enabled);
        setHttpMethod(s.httpMethod);
        if (s.apiUrlMasked) setApiUrl(s.apiUrlMasked);
        if (s.paramsTemplateMasked) setParamsTemplate(s.paramsTemplateMasked);
        setAutoSms(s.autoSmsOnStatusChange ?? false);
        setStatusMapText(
          Object.entries(s.statusSmsMap ?? {})
            .map(([status, template]) => `${status}=${template}`)
            .join('\n'),
        );
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to load SMS settings');
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
      const payload: Parameters<typeof smsSettingsApi.save>[0] = {
        enabled,
        httpMethod,
        // Always allow clearing/updating headers from the form
        headersJson: headersJson.trim() ? headersJson.trim() : '',
      };

      const paramsLookMasked = paramsTemplate.includes('***');
      const urlLooksMasked = apiUrl.includes('…');

      if (!settings?.hasCredentials || (!paramsLookMasked && !urlLooksMasked)) {
        payload.apiUrl = apiUrl.trim();
        payload.paramsTemplate = paramsTemplate.trim();
      } else if (!paramsLookMasked) {
        payload.paramsTemplate = paramsTemplate.trim();
      } else if (!urlLooksMasked && apiUrl.startsWith('http')) {
        payload.apiUrl = apiUrl.trim();
      }

      const saved = await smsSettingsApi.save(payload);
      setSettings(saved);
      setEnabled(saved.enabled);
      setHttpMethod(saved.httpMethod);
      if (saved.apiUrlMasked) setApiUrl(saved.apiUrlMasked);
      if (saved.paramsTemplateMasked) setParamsTemplate(saved.paramsTemplateMasked);
      toast.success('SMS settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!testPhone.trim()) {
      toast.error('Enter a test mobile number');
      return;
    }
    setTesting(true);
    try {
      const result = await smsSettingsApi.test({ phone: testPhone.trim() });
      toast.success(`Test SMS sent to ${result.toPhone}`);
      const refreshed = await smsSettingsApi.get();
      setSettings(refreshed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Test SMS failed');
    } finally {
      setTesting(false);
    }
  }

  async function handleDisconnect() {
    try {
      const s = await smsSettingsApi.disconnect();
      setSettings(s);
      setEnabled(false);
      toast.success('SMS disconnected');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Disconnect failed');
    }
  }

  return (
    <PageShell
      title="SMS"
      description="Org-wise custom SMS gateway (Gennet / SSL / any HTTP API). Secrets are encrypted."
      breadcrumbs={[
        { label: 'Settings', href: '/dashboard/settings' },
        { label: 'Integrations', href: '/dashboard/settings/integrations' },
        { label: 'SMS' },
      ]}
    >
      <div className={cn('space-y-4', ORDER_PAGE_GAP)}>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/settings/integrations">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/settings/sms-templates">SMS templates</Link>
          </Button>
        </div>

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Connection</CardTitle>
          </CardHeader>
          <CardContent className={cn('space-y-4', ORDER_SECTION_BODY_CLASS)}>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
                <FormField label="Enable SMS">
                  <FormSelect
                    value={enabled ? 'yes' : 'no'}
                    onChange={(v) => setEnabled(v === 'yes')}
                    options={[
                      { value: 'yes', label: 'Enable' },
                      { value: 'no', label: 'Disable' },
                    ]}
                  />
                </FormField>
                <p className="text-xs text-muted-foreground">
                  Booked credentials are per organization (SaaS). Ensure your server IP is
                  whitelisted at the SMS provider.
                </p>
                <FormField label="API URL" required>
                  <FormInput
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://isms.gennet.com.bd/api/v3/send-sms"
                  />
                  {settings?.hasCredentials ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Saved: {settings.apiUrlMasked}. Re-paste full URL only if changing.
                    </p>
                  ) : null}
                </FormField>
                <FormField label="HTTP Method">
                  <FormSelect
                    value={httpMethod}
                    onChange={(v) => setHttpMethod(v as 'GET' | 'POST')}
                    options={[
                      { value: 'GET', label: 'GET' },
                      { value: 'POST', label: 'POST' },
                    ]}
                  />
                </FormField>
                <FormField
                  label="Parameters"
                  hint="Must include {mobile_number}, {sms_text}, and preferably {unique_id}"
                >
                  <FormTextarea
                    rows={4}
                    value={paramsTemplate}
                    onChange={(e) => setParamsTemplate(e.target.value)}
                    className="font-mono text-xs"
                  />
                  {settings?.hasCredentials ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Token is masked when loaded. Paste full params (with api_token) only when
                      creating or rotating credentials.
                    </p>
                  ) : null}
                </FormField>
                <FormField
                  label="HTTP Headers (JSON, optional)"
                  hint="Leave empty for Gennet (token goes in Parameters). Only set if your gateway needs headers."
                >
                  <FormTextarea
                    rows={2}
                    value={headersJson}
                    onChange={(e) => setHeadersJson(e.target.value)}
                    placeholder="Usually empty for Gennet"
                    className="font-mono text-xs"
                  />
                </FormField>
                {settings?.lastError ? (
                  <p className="text-sm text-destructive">{settings.lastError}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Can permission="settings.manage">
                    <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                      <Save className="size-4" />
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleDisconnect()}
                    >
                      Disconnect
                    </Button>
                  </Can>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Auto SMS on status change</CardTitle>
          </CardHeader>
          <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoSms}
                onChange={(e) => setAutoSms(e.target.checked)}
              />
              Enable automatic SMS when order status changes
            </label>
            <FormField
              label="Status → template map"
              hint="One per line: status_slug=template_slug (e.g. confirmed=confirm)"
            >
              <FormTextarea
                rows={5}
                value={statusMapText}
                onChange={(e) => setStatusMapText(e.target.value)}
                className="font-mono text-xs"
              />
            </FormField>
            <Can permission="settings.manage">
              <Button
                type="button"
                disabled={savingAutomation}
                onClick={() => {
                  setSavingAutomation(true);
                  const statusSmsMap: Record<string, string> = {};
                  for (const line of statusMapText.split('\n')) {
                    const [status, template] = line.split('=').map((part) => part.trim());
                    if (status && template) statusSmsMap[status] = template;
                  }
                  void smsSettingsApi
                    .saveAutomation({ autoSmsOnStatusChange: autoSms, statusSmsMap })
                    .then((s) => {
                      setSettings(s);
                      toast.success('Automation settings saved');
                    })
                    .catch((error) =>
                      toast.error(
                        error instanceof Error ? error.message : 'Failed to save automation',
                      ),
                    )
                    .finally(() => setSavingAutomation(false));
                }}
              >
                {savingAutomation ? 'Saving…' : 'Save automation'}
              </Button>
            </Can>
          </CardContent>
        </Card>

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Send test SMS</CardTitle>
          </CardHeader>
          <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
            <FormField label="Mobile number">
              <FormInput
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="017XXXXXXXX"
              />
            </FormField>
            <Can permission="settings.manage">
              <Button
                type="button"
                variant="secondary"
                disabled={testing || !settings?.enabled}
                onClick={() => void handleTest()}
              >
                {testing ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
                {testing ? 'Sending…' : 'Send Test SMS'}
              </Button>
            </Can>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

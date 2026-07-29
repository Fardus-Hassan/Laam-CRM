'use client';

import * as React from 'react';
import Link from 'next/link';
import type { AutomationSettings, FollowupAutomationRule } from '@laam/types';
import { CalendarClock, MessageSquare, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormTextarea } from '@/components/form/form-textarea';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Can } from '@/components/auth/can';
import { automationsApi } from '@/features/automations/api/automations-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

function mapToSmsText(map: Record<string, string>): string {
  return Object.entries(map)
    .map(([status, template]) => `${status}=${template}`)
    .join('\n');
}

function parseSmsText(text: string): Record<string, string> {
  const statusSmsMap: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const [status, template] = line.split('=').map((part) => part.trim());
    if (status && template) statusSmsMap[status.toLowerCase()] = template;
  }
  return statusSmsMap;
}

function mapToFollowupText(map: Record<string, FollowupAutomationRule>): string {
  return Object.entries(map)
    .map(([status, rule]) => {
      const note = rule.note?.trim() ? `|${rule.note.trim()}` : '';
      return `${status}=${rule.queue},${rule.delayDays}${note}`;
    })
    .join('\n');
}

function parseFollowupText(text: string): Record<string, FollowupAutomationRule> {
  const statusFollowupMap: Record<string, FollowupAutomationRule> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [left, note] = trimmed.split('|').map((p) => p.trim());
    const [statusPart, rest] = (left ?? '').split('=').map((p) => p.trim());
    if (!statusPart || !rest) continue;
    const [queueRaw, delayRaw] = rest.split(',').map((p) => p.trim());
    const queue = Number(queueRaw ?? 1);
    const delayDays = Number(delayRaw ?? 0);
    statusFollowupMap[statusPart.toLowerCase()] = {
      queue: Number.isFinite(queue) ? Math.min(3, Math.max(1, Math.floor(queue))) : 1,
      delayDays: Number.isFinite(delayDays)
        ? Math.min(90, Math.max(0, Math.floor(delayDays)))
        : 0,
      note: note || undefined,
    };
  }
  return statusFollowupMap;
}

export function AutomationsPage() {
  const [settings, setSettings] = React.useState<AutomationSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [autoSms, setAutoSms] = React.useState(false);
  const [smsMapText, setSmsMapText] = React.useState('');
  const [autoFollowup, setAutoFollowup] = React.useState(false);
  const [followupMapText, setFollowupMapText] = React.useState('');

  React.useEffect(() => {
    void automationsApi
      .getSettings()
      .then((s) => {
        setSettings(s);
        setAutoSms(s.autoSmsOnStatusChange);
        setSmsMapText(mapToSmsText(s.statusSmsMap));
        setAutoFollowup(s.autoFollowupOnStatusChange);
        setFollowupMapText(mapToFollowupText(s.statusFollowupMap));
      })
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : 'Failed to load automations'),
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const next = await automationsApi.saveSettings({
        autoSmsOnStatusChange: autoSms,
        statusSmsMap: parseSmsText(smsMapText),
        autoFollowupOnStatusChange: autoFollowup,
        statusFollowupMap: parseFollowupText(followupMapText),
      });
      setSettings(next);
      toast.success('Automations saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Automations"
      description="SMS and follow-up reminders that run when an order status changes."
    >
      <div className={ORDER_PAGE_GAP}>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MessageSquare className="size-4 text-primary" />
                  Auto SMS on status change
                </CardTitle>
              </CardHeader>
              <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
                {!settings?.smsEnabled ? (
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    SMS gateway is not enabled. Configure credentials first, or SMS automation
                    will not send.
                  </p>
                ) : null}
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
                    value={smsMapText}
                    onChange={(e) => setSmsMapText(e.target.value)}
                    className="font-mono text-xs"
                  />
                </FormField>
                <Button type="button" size="sm" variant="outline" asChild>
                  <Link href="/dashboard/settings/integrations/sms">
                    <Settings2 className="size-4" />
                    SMS gateway & templates
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CalendarClock className="size-4 text-primary" />
                  Follow-up reminder on status change
                </CardTitle>
              </CardHeader>
              <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
                <p className="text-sm text-muted-foreground">
                  Creates a follow-up for the order when status matches (skips if one already
                  exists). Use queue 1–3 and delay days from today.
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoFollowup}
                    onChange={(e) => setAutoFollowup(e.target.checked)}
                  />
                  Enable automatic follow-up when order status changes
                </label>
                <FormField
                  label="Status → follow-up map"
                  hint="One per line: status=queue,delayDays|optional note (e.g. pending=1,0|Call to confirm)"
                >
                  <FormTextarea
                    rows={5}
                    value={followupMapText}
                    onChange={(e) => setFollowupMapText(e.target.value)}
                    className="font-mono text-xs"
                  />
                </FormField>
                <Button type="button" size="sm" variant="outline" asChild>
                  <Link href="/dashboard/followups">Open follow-ups</Link>
                </Button>
              </CardContent>
            </Card>

            <Can permission="settings.manage">
              <div className="flex justify-end">
                <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? 'Saving…' : 'Save automations'}
                </Button>
              </div>
            </Can>
          </>
        )}
      </div>
    </PageShell>
  );
}

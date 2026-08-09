'use client';

import * as React from 'react';
import Link from 'next/link';
import type { SmsTemplate } from '@laam/types';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormTextarea } from '@/components/form/form-textarea';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { smsSettingsApi } from '@/features/settings/api/sms-settings-api';
import { cn } from '@/lib/utils';

export function SmsTemplatesSettingsPage() {
  const [templates, setTemplates] = React.useState<SmsTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void smsSettingsApi
      .listTemplates()
      .then((list) => {
        if (!cancelled) setTemplates(list);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to load templates');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateLocal(id: string, patch: Partial<SmsTemplate>) {
    setTemplates((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function handleSave(template: SmsTemplate) {
    setSavingId(template.id);
    try {
      const saved = await smsSettingsApi.upsertTemplate({
        id: template.id,
        slug: template.slug,
        label: template.label,
        message: template.message,
        enabled: template.enabled,
        sortOrder: template.sortOrder,
      });
      setTemplates((current) => current.map((t) => (t.id === saved.id ? saved : t)));
      toast.success('Template saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <PageShell
      title="SMS Templates"
      description="Placeholders: {customer_name}, {invoice_id}, {business_name}, {courier_invoice}"
      breadcrumbs={[
        { label: 'Settings', href: '/dashboard/settings' },
        { label: 'SMS Templates' },
      ]}
    >
      <div className="mb-4">
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href="/dashboard/settings/integrations/sms">SMS gateway settings</Link>
        </Button>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <Card key={template.id} className="gap-0 py-0 shadow-none">
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">{template.label}</CardTitle>
              </CardHeader>
              <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
                <FormField label="Label">
                  <FormInput
                    value={template.label}
                    onChange={(e) => updateLocal(template.id, { label: e.target.value })}
                  />
                </FormField>
                <FormField label="Message">
                  <FormTextarea
                    rows={3}
                    value={template.message}
                    onChange={(e) => updateLocal(template.id, { message: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Count: {template.message.length}
                  </p>
                </FormField>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleSave(template)}
                  disabled={savingId === template.id}
                >
                  {savingId === template.id ? 'Saving…' : 'Save'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}

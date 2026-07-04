'use client';

import * as React from 'react';
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
import {
  DEFAULT_SMS_TEMPLATES,
  loadSmsTemplates,
  resetSmsTemplates,
  saveSmsTemplates,
  type SmsTemplate,
} from '@/features/orders/data/mock-sms-templates';
import { cn } from '@/lib/utils';

export function SmsTemplatesSettingsPage() {
  const [templates, setTemplates] = React.useState<SmsTemplate[]>(DEFAULT_SMS_TEMPLATES);

  React.useEffect(() => {
    setTemplates(loadSmsTemplates());
  }, []);

  function handleSave() {
    saveSmsTemplates(templates);
    toast.success('SMS templates saved');
  }

  function handleReset() {
    setTemplates(resetSmsTemplates());
    toast.success('Reset to defaults');
  }

  function updateTemplate(id: string, patch: Partial<SmsTemplate>) {
    setTemplates((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  return (
    <PageShell
      title="SMS Templates"
      description="Message templates used in bulk SMS and automations."
    >
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
                  onChange={(e) => updateTemplate(template.id, { label: e.target.value })}
                />
              </FormField>
              <FormField label="Message">
                <FormTextarea
                  rows={3}
                  value={template.message}
                  onChange={(e) => updateTemplate(template.id, { message: e.target.value })}
                  placeholder={template.id === 'custom' ? 'Leave empty for free-form in bulk modal' : ''}
                />
              </FormField>
            </CardContent>
          </Card>
        ))}
        <div className="flex gap-2">
          <Button type="button" onClick={handleSave}>
            Save templates
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset defaults
          </Button>
        </div>
      </div>
    </PageShell>
  );
}

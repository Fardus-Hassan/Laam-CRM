'use client';

import * as React from 'react';
import { Plus, Zap } from 'lucide-react';
import { toast } from 'sonner';

import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  createAutomationRule,
  listAutomationRules,
  toggleAutomationRule,
  type AutomationRule,
} from '@/features/automations/data/mock-automations';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

export function AutomationsPage() {
  const [rules, setRules] = React.useState<AutomationRule[]>([]);

  React.useEffect(() => {
    setRules(listAutomationRules());
  }, []);

  function refresh() {
    setRules(listAutomationRules());
  }

  function handleToggle(id: string) {
    toggleAutomationRule(id);
    refresh();
    toast.success('Rule updated');
  }

  function handleAdd() {
    createAutomationRule({
      name: 'New rule',
      enabled: true,
      trigger: 'order_status',
      triggerValue: 'delivered',
      action: 'sms',
      actionLabel: 'Send delivery SMS',
    });
    refresh();
    toast.success('Rule created (mock — runs with order status changes in production)');
  }

  return (
    <PageShell
      title="Automations"
      description="When order status changes → SMS, follow-up, or courier. Mock rules define the production contract."
    >
      <div className={ORDER_PAGE_GAP}>
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={handleAdd}>
            <Plus className="size-4" />
            New rule
          </Button>
        </div>

        {rules.map((rule) => (
          <Card key={rule.id} className={ORDER_CARD_CLASS}>
            <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex-row items-center justify-between')}>
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                <CardTitle className="text-sm">{rule.name}</CardTitle>
                <Badge variant={rule.enabled ? 'success' : 'secondary'}>
                  {rule.enabled ? 'On' : 'Off'}
                </Badge>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => handleToggle(rule.id)}>
                {rule.enabled ? 'Disable' : 'Enable'}
              </Button>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'text-sm text-muted-foreground')}>
              <p>
                When order status = <strong className="text-foreground">{rule.triggerValue}</strong>
              </p>
              <p className="mt-1">
                Then: <strong className="text-foreground">{rule.actionLabel}</strong>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

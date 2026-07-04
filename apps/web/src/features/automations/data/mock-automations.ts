export type AutomationRule = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: 'order_status';
  triggerValue: string;
  action: 'sms' | 'followup' | 'courier' | 'assign';
  actionLabel: string;
};

let rules: AutomationRule[] = [
  {
    id: 'auto-1',
    name: 'SMS on confirm',
    enabled: true,
    trigger: 'order_status',
    triggerValue: 'confirmed',
    action: 'sms',
    actionLabel: 'Send confirm SMS template',
  },
  {
    id: 'auto-2',
    name: 'Follow-up on pending',
    enabled: true,
    trigger: 'order_status',
    triggerValue: 'pending',
    action: 'followup',
    actionLabel: 'Create follow-up in queue 1',
  },
  {
    id: 'auto-3',
    name: 'Queue courier on confirm',
    enabled: false,
    trigger: 'order_status',
    triggerValue: 'confirmed',
    action: 'courier',
    actionLabel: 'Add to courier ready list',
  },
];

export function listAutomationRules(): AutomationRule[] {
  return [...rules];
}

export function toggleAutomationRule(id: string): AutomationRule | undefined {
  rules = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
  return rules.find((r) => r.id === id);
}

export function createAutomationRule(input: Omit<AutomationRule, 'id'>): AutomationRule {
  const rule: AutomationRule = { ...input, id: `auto-${Date.now()}` };
  rules = [rule, ...rules];
  return rule;
}

export function getEnabledRulesForStatus(status: string): AutomationRule[] {
  return rules.filter((r) => r.enabled && r.trigger === 'order_status' && r.triggerValue === status);
}

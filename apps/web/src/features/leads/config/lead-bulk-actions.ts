export type LeadBulkActionId =
  | 'assign'
  | 'transfer'
  | 'confirm'
  | 'add_note'
  | 'send_sms'
  | 'set_followup'
  | 'export'
  | 'mark_contacted'
  | 'mark_qualified'
  | 'mark_lost';

export type LeadBulkActionDefinition = {
  id: LeadBulkActionId;
  label: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  requiresSelection?: boolean;
};

export const LEAD_BULK_ACTIONS: LeadBulkActionDefinition[] = [
  { id: 'assign', label: 'Assign agent', requiresSelection: true },
  { id: 'transfer', label: 'Transfer agent', requiresSelection: true, variant: 'secondary' },
  { id: 'confirm', label: 'Confirm lead', requiresSelection: true },
  { id: 'mark_contacted', label: 'Mark contacted', requiresSelection: true, variant: 'outline' },
  { id: 'mark_qualified', label: 'Mark qualified', requiresSelection: true, variant: 'outline' },
  { id: 'add_note', label: 'Add note', requiresSelection: true, variant: 'outline' },
  { id: 'set_followup', label: 'Set follow-up', requiresSelection: true, variant: 'outline' },
  { id: 'send_sms', label: 'Send SMS', requiresSelection: true, variant: 'outline' },
  { id: 'mark_lost', label: 'Mark lost', requiresSelection: true, variant: 'destructive' },
  { id: 'export', label: 'Export', requiresSelection: true, variant: 'outline' },
];

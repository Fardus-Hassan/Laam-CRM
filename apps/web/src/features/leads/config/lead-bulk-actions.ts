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
  /** If set, button is hidden unless the user has this permission. */
  permission?: import('@laam/types').Permission;
};

export const LEAD_BULK_ACTIONS: LeadBulkActionDefinition[] = [
  { id: 'assign', label: 'Assign agent', requiresSelection: true, permission: 'leads.assign' },
  { id: 'transfer', label: 'Transfer agent', requiresSelection: true, variant: 'secondary', permission: 'leads.assign' },
  { id: 'confirm', label: 'Confirm lead', requiresSelection: true, permission: 'leads.edit' },
  { id: 'mark_contacted', label: 'Mark contacted', requiresSelection: true, variant: 'outline', permission: 'leads.edit' },
  { id: 'mark_qualified', label: 'Mark qualified', requiresSelection: true, variant: 'outline', permission: 'leads.edit' },
  { id: 'add_note', label: 'Add note', requiresSelection: true, variant: 'outline', permission: 'leads.edit' },
  { id: 'set_followup', label: 'Set follow-up', requiresSelection: true, variant: 'outline', permission: 'leads.edit' },
  { id: 'send_sms', label: 'Send SMS', requiresSelection: true, variant: 'outline', permission: 'leads.edit' },
  { id: 'mark_lost', label: 'Mark lost', requiresSelection: true, variant: 'destructive', permission: 'leads.edit' },
  { id: 'export', label: 'Export', requiresSelection: true, variant: 'outline', permission: 'leads.export' },
];

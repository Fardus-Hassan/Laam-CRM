export type ContactBulkActionId =
  | 'send_sms'
  | 'set_followup'
  | 'transfer'
  | 'add_note'
  | 'log_call'
  | 'export';

export type ContactBulkActionDefinition = {
  id: ContactBulkActionId;
  label: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  requiresSelection?: boolean;
};

export const CONTACT_BULK_ACTIONS: ContactBulkActionDefinition[] = [
  { id: 'send_sms', label: 'Send SMS', requiresSelection: true, variant: 'outline' },
  { id: 'set_followup', label: 'Set follow-up', requiresSelection: true, variant: 'outline' },
  { id: 'log_call', label: 'Log call', requiresSelection: true, variant: 'outline' },
  { id: 'transfer', label: 'Transfer', requiresSelection: true, variant: 'secondary' },
  { id: 'add_note', label: 'Add note', requiresSelection: true, variant: 'outline' },
  { id: 'export', label: 'Export', requiresSelection: true, variant: 'outline' },
];

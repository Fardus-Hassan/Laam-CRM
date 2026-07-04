export type CustomerBulkActionId =
  | 'send_sms'
  | 'set_followup'
  | 'auto_followup'
  | 'transfer'
  | 'bulk_action'
  | 'add_note'
  | 'export'
  | 'delete';

export type CustomerBulkActionDefinition = {
  id: CustomerBulkActionId;
  label: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  requiresSelection?: boolean;
};

export const CUSTOMER_BULK_ACTIONS: CustomerBulkActionDefinition[] = [
  { id: 'send_sms', label: 'Send SMS', requiresSelection: true, variant: 'outline' },
  { id: 'set_followup', label: 'Set follow-up', requiresSelection: true, variant: 'outline' },
  { id: 'auto_followup', label: 'Auto follow-up', requiresSelection: true, variant: 'secondary' },
  { id: 'transfer', label: 'Transfer', requiresSelection: true, variant: 'secondary' },
  { id: 'add_note', label: 'Add note', requiresSelection: true, variant: 'outline' },
  { id: 'bulk_action', label: 'Bulk action', requiresSelection: true, variant: 'outline' },
  { id: 'export', label: 'Export', requiresSelection: true, variant: 'outline' },
  { id: 'delete', label: 'Delete', requiresSelection: true, variant: 'destructive' },
];

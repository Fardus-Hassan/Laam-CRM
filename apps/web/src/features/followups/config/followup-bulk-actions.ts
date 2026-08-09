export type FollowupBulkActionId =
  | 'send_sms'
  | 'change_date'
  | 'transfer'
  | 'assign_tag'
  | 'set_status'
  | 'export';

export type FollowupBulkActionDefinition = {
  id: FollowupBulkActionId;
  label: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  requiresSelection?: boolean;
  permission?: import('@laam/types').Permission;
};

export const FOLLOWUP_BULK_ACTIONS: FollowupBulkActionDefinition[] = [
  { id: 'send_sms', label: 'Send SMS', requiresSelection: true, variant: 'outline', permission: 'activities.edit' },
  { id: 'change_date', label: 'Change date', requiresSelection: true, variant: 'outline', permission: 'activities.edit' },
  { id: 'transfer', label: 'Transfer', requiresSelection: true, variant: 'secondary', permission: 'activities.edit' },
  { id: 'assign_tag', label: 'Assign tag', requiresSelection: true, variant: 'outline', permission: 'activities.edit' },
  { id: 'set_status', label: 'Set status', requiresSelection: true, variant: 'outline', permission: 'activities.edit' },
  { id: 'export', label: 'Export', requiresSelection: true, variant: 'outline', permission: 'activities.view' },
];

import type { BulkActionId } from '@laam/types';

export type BulkActionDefinition = {
  id: BulkActionId;
  label: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  requiresSelection?: boolean;
};

export const BULK_ACTIONS_REGISTRY: Record<BulkActionId, BulkActionDefinition> = {
  print_selected: { id: 'print_selected', label: 'Print Selected', requiresSelection: true },
  print_barcode: { id: 'print_barcode', label: 'Print Barcode', requiresSelection: true },
  print_info: { id: 'print_info', label: 'Print Info', requiresSelection: true },
  print_info_2: { id: 'print_info_2', label: 'Print Info 2', requiresSelection: true },
  export: { id: 'export', label: 'Export', requiresSelection: true },
  submit_pathao: { id: 'submit_pathao', label: 'Submit Pathao', variant: 'secondary' },
  submit_steadfast: { id: 'submit_steadfast', label: 'Submit Steadfast', variant: 'secondary' },
  submit_carrybee: { id: 'submit_carrybee', label: 'Submit CarryBee', variant: 'secondary' },
  update_courier_status: { id: 'update_courier_status', label: 'Update Courier Status' },
  send_sms: { id: 'send_sms', label: 'Send SMS', requiresSelection: true },
  set_followup: { id: 'set_followup', label: 'Set Followup', requiresSelection: true },
  transfer: { id: 'transfer', label: 'Transfer Selected', requiresSelection: true },
  courier_unlink: { id: 'courier_unlink', label: 'Courier Unlink', variant: 'destructive', requiresSelection: true },
  status_change: { id: 'status_change', label: 'Change Status', requiresSelection: true },
};

export function resolveBulkActions(ids: BulkActionId[]): BulkActionDefinition[] {
  return ids.map((id) => BULK_ACTIONS_REGISTRY[id]).filter(Boolean);
}

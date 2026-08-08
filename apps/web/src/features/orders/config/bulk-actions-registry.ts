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
  submit_pathao: {
    id: 'submit_pathao',
    label: 'Submit Pathao',
    variant: 'secondary',
    requiresSelection: true,
  },
  submit_carrybee: {
    id: 'submit_carrybee',
    label: 'Submit Carrybee',
    variant: 'secondary',
    requiresSelection: true,
  },
  update_courier_status: {
    id: 'update_courier_status',
    label: 'Update Courier Status',
    requiresSelection: true,
  },
  send_sms: { id: 'send_sms', label: 'Send SMS', requiresSelection: true },
  set_followup: { id: 'set_followup', label: 'Set Followup', requiresSelection: true },
  transfer: { id: 'transfer', label: 'Transfer Selected', requiresSelection: true },
  courier_cancel: {
    id: 'courier_cancel',
    label: 'Cancel Courier',
    variant: 'destructive',
    requiresSelection: true,
  },
  courier_unlink: {
    id: 'courier_unlink',
    label: 'Courier Unlink',
    variant: 'destructive',
    requiresSelection: true,
  },
  status_change: { id: 'status_change', label: 'Change Status', requiresSelection: true },
};

/**
 * Canonical bulk bar for All Orders / any status list when not customized.
 * Settings → Order Statuses can hide items per status.
 */
export const DEFAULT_ORDER_BULK_ACTIONS: BulkActionId[] = [
  'status_change',
  'print_selected',
  'print_barcode',
  'print_info',
  'export',
  'send_sms',
  'set_followup',
  'transfer',
  'submit_pathao',
  'submit_carrybee',
  'courier_cancel',
  'courier_unlink',
];

/** Stable order for settings checkboxes (matches toolbar priority). */
export const BULK_ACTION_SETTINGS_ORDER: BulkActionId[] = [
  'status_change',
  'print_selected',
  'print_barcode',
  'print_info',
  'print_info_2',
  'export',
  'send_sms',
  'set_followup',
  'transfer',
  'submit_pathao',
  'submit_carrybee',
  'update_courier_status',
  'courier_cancel',
  'courier_unlink',
];

export function listBulkActionDefinitions(
  ids: BulkActionId[] = BULK_ACTION_SETTINGS_ORDER,
): BulkActionDefinition[] {
  return ids
    .map((id) => BULK_ACTIONS_REGISTRY[id])
    .filter((action): action is BulkActionDefinition => Boolean(action));
}

/**
 * Empty / missing config → full All Orders set.
 * Legacy “create status” used only export/status_change/send_sms — treat as unconfigured.
 * Non-empty custom allowlist → exactly those actions (Settings hide/show).
 */
export function resolveConfiguredBulkActions(
  configured?: BulkActionId[] | null,
): BulkActionId[] {
  if (!configured || configured.length === 0 || isLegacyMinimalBulkActions(configured)) {
    return [...DEFAULT_ORDER_BULK_ACTIONS];
  }
  const seen = new Set<BulkActionId>();
  const out: BulkActionId[] = [];
  for (const id of configured) {
    if (!BULK_ACTIONS_REGISTRY[id] || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.length > 0 ? out : [...DEFAULT_ORDER_BULK_ACTIONS];
}

const LEGACY_MINIMAL_BULK = new Set<BulkActionId>([
  'export',
  'status_change',
  'send_sms',
]);

function isLegacyMinimalBulkActions(configured: BulkActionId[]): boolean {
  if (configured.length === 0 || configured.length > 3) return false;
  return configured.every((id) => LEGACY_MINIMAL_BULK.has(id));
}

export function resolveBulkActions(ids: BulkActionId[]): BulkActionDefinition[] {
  return ids
    .map((id) => BULK_ACTIONS_REGISTRY[id])
    .filter((action): action is BulkActionDefinition => Boolean(action));
}

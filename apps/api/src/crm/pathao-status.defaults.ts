/** Pathao official courier status catalog (docs / webhook events). */
export type PathaoStatusSeed = {
  slug: string;
  label: string;
  crmStatus: string | null;
  isTerminal: boolean;
  sortOrder: number;
};

export const PATHAO_STATUS_SEEDS: PathaoStatusSeed[] = [
  { slug: 'pending', label: 'Pathao - Pending', crmStatus: 'in_courier', isTerminal: false, sortOrder: 10 },
  { slug: 'pickup_requested', label: 'Pathao - Pickup Requested', crmStatus: 'in_courier', isTerminal: false, sortOrder: 20 },
  { slug: 'assigned_for_pickup', label: 'Pathao - Assigned For Pickup', crmStatus: 'in_courier', isTerminal: false, sortOrder: 30 },
  { slug: 'pickup', label: 'Pathao - Pickup', crmStatus: 'in_courier', isTerminal: false, sortOrder: 40 },
  { slug: 'pickup_failed', label: 'Pathao - Pickup Failed', crmStatus: 'hold', isTerminal: false, sortOrder: 50 },
  { slug: 'pickup_cancelled', label: 'Pathao - Pickup Cancelled', crmStatus: 'hold', isTerminal: true, sortOrder: 60 },
  { slug: 'at_the_sorting_hub', label: 'Pathao - At the Sorting Hub', crmStatus: 'in_courier', isTerminal: false, sortOrder: 70 },
  { slug: 'in_transit', label: 'Pathao - In Transit', crmStatus: 'in_courier', isTerminal: false, sortOrder: 80 },
  { slug: 'received_at_last_mile_hub', label: 'Pathao - Received at Last Mile Hub', crmStatus: 'in_courier', isTerminal: false, sortOrder: 90 },
  { slug: 'assigned_for_delivery', label: 'Pathao - Assigned for Delivery', crmStatus: 'in_courier', isTerminal: false, sortOrder: 100 },
  { slug: 'delivered', label: 'Pathao - Delivered', crmStatus: 'delivered', isTerminal: true, sortOrder: 110 },
  { slug: 'partial_delivery', label: 'Pathao - Partial Delivery', crmStatus: 'delivered', isTerminal: true, sortOrder: 120 },
  { slug: 'return', label: 'Pathao - Return', crmStatus: 'returned', isTerminal: true, sortOrder: 130 },
  { slug: 'delivery_failed', label: 'Pathao - Delivery Failed', crmStatus: 'hold', isTerminal: false, sortOrder: 140 },
  { slug: 'on_hold', label: 'Pathao - On Hold', crmStatus: 'hold', isTerminal: false, sortOrder: 150 },
  { slug: 'paid_return', label: 'Pathao - Paid Return', crmStatus: 'returned', isTerminal: true, sortOrder: 160 },
  { slug: 'exchange', label: 'Pathao - Exchange', crmStatus: 'in_courier', isTerminal: false, sortOrder: 170 },
  { slug: 'lost', label: 'Pathao - Lost', crmStatus: 'hold', isTerminal: true, sortOrder: 180 },
];

/** Normalize Pathao slug / event / display status to catalog slug. */
export function normalizePathaoStatusSlug(raw: string | null | undefined): string {
  if (!raw) return 'pending';
  let s = raw.trim().toLowerCase();
  s = s.replace(/^order\./, '');
  s = s.replace(/^pathao\s*-\s*/, '');
  s = s.replace(/[\s-]+/g, '_');
  // Common aliases from Short Info / webhooks
  const aliases: Record<string, string> = {
    picked: 'pickup',
    picked_up: 'pickup',
    returned: 'return',
    cancelled: 'pickup_cancelled',
    canceled: 'pickup_cancelled',
    pickup_cancel: 'pickup_cancelled',
    pickup_canceled: 'pickup_cancelled',
    hold: 'on_hold',
    paid_return: 'paid_return',
    partial_delivered: 'partial_delivery',
    at_sorting_hub: 'at_the_sorting_hub',
    sorting_hub: 'at_the_sorting_hub',
  };
  return aliases[s] ?? s;
}

/** True when Pathao status means the consignment is cancelled / gone. */
export function isPathaoCancelledStatus(
  status?: string | null,
  slug?: string | null,
): boolean {
  const normalized = normalizePathaoStatusSlug(slug || status);
  if (normalized === 'pickup_cancelled' || normalized === 'return') return true;
  const hay = `${status ?? ''} ${slug ?? ''}`.toLowerCase();
  return /cancel|void|aborted/.test(hay);
}

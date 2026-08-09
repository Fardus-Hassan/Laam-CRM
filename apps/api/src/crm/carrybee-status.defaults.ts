/** Carrybee webhook / transfer status catalog → CRM map. */
export type CarrybeeStatusSeed = {
  slug: string;
  label: string;
  crmStatus: string | null;
  isTerminal: boolean;
  sortOrder: number;
};

export const CARRYBEE_STATUS_SEEDS: CarrybeeStatusSeed[] = [
  { slug: 'created', label: 'Carrybee - Created', crmStatus: 'in_courier', isTerminal: false, sortOrder: 10 },
  { slug: 'pickup_requested', label: 'Carrybee - Pickup Requested', crmStatus: 'in_courier', isTerminal: false, sortOrder: 20 },
  { slug: 'assigned_for_pickup', label: 'Carrybee - Assigned For Pickup', crmStatus: 'in_courier', isTerminal: false, sortOrder: 30 },
  { slug: 'picked', label: 'Carrybee - Picked', crmStatus: 'in_courier', isTerminal: false, sortOrder: 40 },
  { slug: 'pickup_failed', label: 'Carrybee - Pickup Failed', crmStatus: 'hold', isTerminal: false, sortOrder: 50 },
  { slug: 'pickup_cancelled', label: 'Carrybee - Pickup Cancelled', crmStatus: 'hold', isTerminal: true, sortOrder: 60 },
  { slug: 'at_the_sorting_hub', label: 'Carrybee - At Sorting Hub', crmStatus: 'in_courier', isTerminal: false, sortOrder: 70 },
  { slug: 'on_the_way_to_central_warehouse', label: 'Carrybee - To Central Warehouse', crmStatus: 'in_courier', isTerminal: false, sortOrder: 80 },
  { slug: 'at_central_warehouse', label: 'Carrybee - At Central Warehouse', crmStatus: 'in_courier', isTerminal: false, sortOrder: 90 },
  { slug: 'in_transit', label: 'Carrybee - In Transit', crmStatus: 'in_courier', isTerminal: false, sortOrder: 100 },
  { slug: 'received_at_last_mile_hub', label: 'Carrybee - Last Mile Hub', crmStatus: 'in_courier', isTerminal: false, sortOrder: 110 },
  { slug: 'assigned_for_delivery', label: 'Carrybee - Assigned For Delivery', crmStatus: 'in_courier', isTerminal: false, sortOrder: 120 },
  { slug: 'delivery_on_hold', label: 'Carrybee - Delivery On Hold', crmStatus: 'hold', isTerminal: false, sortOrder: 130 },
  { slug: 'delivered', label: 'Carrybee - Delivered', crmStatus: 'delivered', isTerminal: true, sortOrder: 140 },
  { slug: 'partial_delivery', label: 'Carrybee - Partial Delivery', crmStatus: 'delivered', isTerminal: true, sortOrder: 150 },
  { slug: 'delivery_failed', label: 'Carrybee - Delivery Failed', crmStatus: 'hold', isTerminal: false, sortOrder: 160 },
  { slug: 'returned', label: 'Carrybee - Returned', crmStatus: 'rts_carrybee', isTerminal: true, sortOrder: 170 },
  { slug: 'paid_return', label: 'Carrybee - Paid Return', crmStatus: 'returned', isTerminal: true, sortOrder: 180 },
  { slug: 'returned_to_merchant', label: 'Carrybee - Returned To Merchant', crmStatus: 'rts_carrybee', isTerminal: true, sortOrder: 190 },
  { slug: 'paid', label: 'Carrybee - Paid', crmStatus: 'completed', isTerminal: true, sortOrder: 200 },
];

export function normalizeCarrybeeStatusSlug(raw: string | null | undefined): string {
  if (!raw) return 'created';
  let s = raw.trim().toLowerCase();
  s = s.replace(/^order\./, '');
  s = s.replace(/^carrybee\s*-\s*/, '');
  s = s.replace(/[\s-]+/g, '_');
  const aliases: Record<string, string> = {
    create_failed: 'pickup_cancelled',
    cancelled: 'pickup_cancelled',
    canceled: 'pickup_cancelled',
    return: 'returned',
    on_hold: 'delivery_on_hold',
    hold: 'delivery_on_hold',
    exchange: 'in_transit',
    returned_at_sorting: 'returned',
    returned_in_transit: 'returned',
  };
  return aliases[s] ?? s;
}

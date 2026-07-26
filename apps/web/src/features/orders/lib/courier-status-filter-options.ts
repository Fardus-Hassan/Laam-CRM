/** Fallback catalogs for order filter when status-map API is empty/unavailable. */
export const PATHAO_COURIER_STATUS_FILTER_OPTIONS: Array<{ slug: string; label: string }> = [
  { slug: 'pending', label: 'Pathao - Pending' },
  { slug: 'pickup_requested', label: 'Pathao - Pickup Requested' },
  { slug: 'assigned_for_pickup', label: 'Pathao - Assigned For Pickup' },
  { slug: 'pickup', label: 'Pathao - Pickup' },
  { slug: 'pickup_failed', label: 'Pathao - Pickup Failed' },
  { slug: 'pickup_cancelled', label: 'Pathao - Pickup Cancelled' },
  { slug: 'at_the_sorting_hub', label: 'Pathao - At the Sorting Hub' },
  { slug: 'in_transit', label: 'Pathao - In Transit' },
  { slug: 'received_at_last_mile_hub', label: 'Pathao - Received at Last Mile Hub' },
  { slug: 'assigned_for_delivery', label: 'Pathao - Assigned for Delivery' },
  { slug: 'delivered', label: 'Pathao - Delivered' },
  { slug: 'partial_delivery', label: 'Pathao - Partial Delivery' },
  { slug: 'return', label: 'Pathao - Return' },
  { slug: 'delivery_failed', label: 'Pathao - Delivery Failed' },
  { slug: 'on_hold', label: 'Pathao - On Hold' },
  { slug: 'paid_return', label: 'Pathao - Paid Return' },
  { slug: 'exchange', label: 'Pathao - Exchange' },
  { slug: 'lost', label: 'Pathao - Lost' },
];

export const CARRYBEE_COURIER_STATUS_FILTER_OPTIONS: Array<{ slug: string; label: string }> = [
  { slug: 'created', label: 'Carrybee - Created' },
  { slug: 'pickup_requested', label: 'Carrybee - Pickup Requested' },
  { slug: 'assigned_for_pickup', label: 'Carrybee - Assigned For Pickup' },
  { slug: 'picked', label: 'Carrybee - Picked' },
  { slug: 'pickup_failed', label: 'Carrybee - Pickup Failed' },
  { slug: 'pickup_cancelled', label: 'Carrybee - Pickup Cancelled' },
  { slug: 'at_the_sorting_hub', label: 'Carrybee - At Sorting Hub' },
  { slug: 'on_the_way_to_central_warehouse', label: 'Carrybee - To Central Warehouse' },
  { slug: 'at_central_warehouse', label: 'Carrybee - At Central Warehouse' },
  { slug: 'in_transit', label: 'Carrybee - In Transit' },
  { slug: 'received_at_last_mile_hub', label: 'Carrybee - Last Mile Hub' },
  { slug: 'assigned_for_delivery', label: 'Carrybee - Assigned For Delivery' },
  { slug: 'delivery_on_hold', label: 'Carrybee - Delivery On Hold' },
  { slug: 'delivered', label: 'Carrybee - Delivered' },
  { slug: 'partial_delivery', label: 'Carrybee - Partial Delivery' },
  { slug: 'delivery_failed', label: 'Carrybee - Delivery Failed' },
  { slug: 'returned', label: 'Carrybee - Returned' },
  { slug: 'paid_return', label: 'Carrybee - Paid Return' },
  { slug: 'returned_to_merchant', label: 'Carrybee - Returned To Merchant' },
  { slug: 'paid', label: 'Carrybee - Paid' },
];

export type CourierStatusFilterOption = {
  /** Unique select value: `pathao:delivered` / `carrybee:created` */
  value: string;
  label: string;
  provider: 'pathao' | 'carrybee';
  slug: string;
};

export function buildCourierStatusFilterOptions(
  pathaoMaps: Array<{ slug: string; label: string; isActive?: boolean }>,
  carrybeeMaps: Array<{ slug: string; label: string; isActive?: boolean }>,
): CourierStatusFilterOption[] {
  const pathao =
    pathaoMaps.filter((m) => m.isActive !== false).length > 0
      ? pathaoMaps.filter((m) => m.isActive !== false)
      : PATHAO_COURIER_STATUS_FILTER_OPTIONS;
  const carrybee =
    carrybeeMaps.filter((m) => m.isActive !== false).length > 0
      ? carrybeeMaps.filter((m) => m.isActive !== false)
      : CARRYBEE_COURIER_STATUS_FILTER_OPTIONS;

  const options: CourierStatusFilterOption[] = [
    ...pathao.map((m) => ({
      value: `pathao:${m.slug}`,
      label: m.label.startsWith('Pathao') ? m.label : `Pathao - ${m.label}`,
      provider: 'pathao' as const,
      slug: m.slug,
    })),
    ...carrybee.map((m) => ({
      value: `carrybee:${m.slug}`,
      label: m.label.startsWith('Carrybee') ? m.label : `Carrybee - ${m.label}`,
      provider: 'carrybee' as const,
      slug: m.slug,
    })),
  ];

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export function parseCourierStatusFilterValue(
  value: string | undefined,
): { provider?: 'pathao' | 'carrybee'; slug?: string } {
  if (!value) return {};
  const idx = value.indexOf(':');
  if (idx <= 0) return { slug: value };
  const provider = value.slice(0, idx);
  const slug = value.slice(idx + 1);
  if (provider === 'pathao' || provider === 'carrybee') {
    return { provider, slug };
  }
  return { slug: value };
}

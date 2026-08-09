import type { OrderCourierStats } from '@laam/types';

const SUCCESS_STATUSES = new Set([
  'delivered',
  'completed',
  'hand_delivery_completed',
]);

const FAIL_STATUSES = new Set([
  'returned',
  'pending_return',
  'return_collection',
  'rts_carrybee',
  'cancelled',
]);

const CURRENT_STATUSES = new Set([
  'in_courier',
  'processing',
  'processing_2',
  'hand_delivery',
  'courier_payment_validate',
]);

export function buildCourierStatsFromStatusCounts(
  countsByStatus: Record<string, number>,
): OrderCourierStats {
  let to = 0;
  let co = 0;
  let su = 0;
  let fa = 0;

  for (const [status, count] of Object.entries(countsByStatus)) {
    if (count <= 0) continue;
    to += count;
    if (SUCCESS_STATUSES.has(status)) su += count;
    else if (FAIL_STATUSES.has(status)) fa += count;
    else if (CURRENT_STATUSES.has(status)) co += count;
  }

  const decided = su + fa;
  const percent = decided > 0 ? Math.round((su / decided) * 100) : to > 0 ? 100 : 0;

  let label = 'New';
  if (to >= 10) label = 'Frequent';
  else if (to >= 2) label = 'Regular';

  if (decided >= 3 && percent < 50) label = 'Risky';

  return { to, co, su, fa, label, percent: Math.min(100, Math.max(0, percent)) };
}

import type { WebsiteOrderIngestLine } from '@laam/types';

/** Statuses that can still absorb a website re-submit (pre-shipment). */
export const WEBSITE_INGEST_LINKABLE_STATUSES = new Set([
  'incomplete',
  'pending',
  'confirmed',
  'hold',
  'hold_followup',
  'good_but_no_response',
  'variation_1',
  'pending_incomplete',
]);

/** Already fulfilled / courier — never auto-merge. */
export const WEBSITE_INGEST_BLOCK_LINK_STATUSES = new Set([
  'processing',
  'processing_2',
  'in_courier',
  'delivered',
  'completed',
  'cancelled',
  'returned',
  'pending_return',
  'hand_delivery',
]);

export function normalizePhoneDigits(phone: string): string {
  return String(phone ?? '').replace(/\D/g, '');
}

export function cartFingerprint(
  lines: Array<{
    sku?: string | null;
    productName?: string | null;
    quantity?: number | null;
  }>,
): string {
  return lines
    .map((line) => {
      const sku = String(line.sku ?? '')
        .trim()
        .toUpperCase();
      const name = String(line.productName ?? '')
        .trim()
        .toLowerCase();
      const qty = Math.max(1, Math.floor(Number(line.quantity) || 1));
      return `${sku || name}|${qty}`;
    })
    .sort()
    .join(';');
}

export function cartFingerprintFromIngestLines(lines: WebsiteOrderIngestLine[]): string {
  return cartFingerprint(lines);
}

/**
 * Decide next CRM status when linking a website submit onto an existing order.
 * Team-confirmed / hold stays; incomplete promotes to pending on Woo processing.
 */
export function resolveLinkedStatus(params: {
  existingStatus: string;
  incomingStatus: string;
}): { nextStatus: string | null; reason: string } {
  const existing = params.existingStatus.trim();
  const incoming = params.incomingStatus.trim() || 'pending';

  if (WEBSITE_INGEST_BLOCK_LINK_STATUSES.has(existing)) {
    return { nextStatus: null, reason: 'blocked_post_shipment' };
  }

  // Soft team confirm / hold: keep status, only attach Woo id + note.
  if (existing === 'confirmed' || existing === 'hold' || existing === 'hold_followup') {
    return { nextStatus: null, reason: 'keep_ops_status' };
  }

  // Incomplete + Woo processing/submit → Pending intake.
  if (existing === 'incomplete' && incoming === 'pending') {
    return { nextStatus: 'pending', reason: 'incomplete_to_pending' };
  }

  // Same incomplete refresh.
  if (existing === 'incomplete' && incoming === 'incomplete') {
    return { nextStatus: null, reason: 'keep_incomplete' };
  }

  // Pending stays pending if another processing webhook arrives.
  if (existing === 'pending') {
    return { nextStatus: null, reason: 'keep_pending' };
  }

  // Incoming cancelled should not silently cancel a live ops order via link.
  if (incoming === 'cancelled') {
    return { nextStatus: null, reason: 'ignore_incoming_cancel' };
  }

  return { nextStatus: null, reason: 'keep_existing' };
}

export type LinkCandidate = {
  id: string;
  orderNumber: string;
  status: string;
  externalOrderId: string | null;
  notes: string | null;
  createdAt: Date;
  lineItems: Array<{ sku: string | null; productName: string; quantity: number }>;
};

/**
 * Pick the best same-journey order within the match window (newest first).
 * Same cart required. Returns null when no safe link.
 */
export function pickLinkCandidate(params: {
  candidates: LinkCandidate[];
  incomingCart: string;
  now?: Date;
  windowMs: number;
}): LinkCandidate | null {
  const now = params.now ?? new Date();
  const sorted = [...params.candidates].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  for (const row of sorted) {
    if (WEBSITE_INGEST_BLOCK_LINK_STATUSES.has(row.status)) continue;
    if (!WEBSITE_INGEST_LINKABLE_STATUSES.has(row.status)) continue;
    if (now.getTime() - row.createdAt.getTime() > params.windowMs) continue;
    const existingCart = cartFingerprint(row.lineItems);
    if (existingCart !== params.incomingCart) continue;
    return row;
  }
  return null;
}

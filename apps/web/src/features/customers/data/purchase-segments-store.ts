import type { OrgCustomerPurchaseSegment } from '@laam/types';
import { purchaseSegmentShowsInSidebar } from '@laam/types';

import { MOCK_PURCHASE_SEGMENTS } from '@/features/customers/data/mock-purchase-segments';

export const PURCHASE_SEGMENTS_CHANGED = 'laam-purchase-segments-changed';

let serverSegments: OrgCustomerPurchaseSegment[] | null = null;

function emitChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PURCHASE_SEGMENTS_CHANGED));
  }
}

export function setServerPurchaseSegments(
  segments: OrgCustomerPurchaseSegment[],
): void {
  serverSegments = segments;
  emitChanged();
}

export function clearServerPurchaseSegments(): void {
  serverSegments = null;
  emitChanged();
}

export function getPurchaseSegments(): OrgCustomerPurchaseSegment[] {
  if (process.env.NEXT_PUBLIC_USE_API === 'true') {
    return serverSegments ?? MOCK_PURCHASE_SEGMENTS;
  }
  return MOCK_PURCHASE_SEGMENTS;
}

export function getNavPurchaseSegments(): OrgCustomerPurchaseSegment[] {
  return getPurchaseSegments()
    .filter(
      (segment) =>
        segment.isActive && purchaseSegmentShowsInSidebar(segment),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

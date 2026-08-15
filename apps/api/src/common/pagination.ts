/**
 * Shared list pagination clamp for CRM APIs.
 * Matches web `CRM_MAX_PAGE_SIZE` (apps/web/.../page-size-options.ts).
 */
export const CRM_MAX_PAGE_SIZE = 1000;

export function clampPageSize(raw: number | undefined | null, fallback = 20): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(CRM_MAX_PAGE_SIZE, Math.max(1, Math.floor(n)));
}

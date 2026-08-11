/**
 * Shared CRM table page-size choices (5–1000).
 * Keep in sync across list shells + pagination controls.
 */
export const CRM_MAX_PAGE_SIZE = 1000;

export const CRM_PAGE_SIZE_OPTIONS = [
  5, 10, 25, 50, 75, 100, 150, 200, 250, 500, 750, 1000,
] as const;

export type CrmPageSizeOption = (typeof CRM_PAGE_SIZE_OPTIONS)[number];

/** Clamp a user/API page size into the safe 1–1000 range. */
export function clampCrmPageSize(value: number, fallback = 10): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(CRM_MAX_PAGE_SIZE, Math.max(1, Math.floor(value)));
}

/** Parse free-text page size (from custom input). Returns null if invalid. */
export function parseCrmPageSizeInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 1) return null;
  return clampCrmPageSize(n);
}

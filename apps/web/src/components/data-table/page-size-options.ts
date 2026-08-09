/**
 * Shared CRM table page-size choices (5–500).
 * Keep in sync across Orders and other list shells.
 */
export const CRM_PAGE_SIZE_OPTIONS = [
  5, 10, 25, 50, 75, 100, 150, 200, 250, 500,
] as const;

export type CrmPageSizeOption = (typeof CRM_PAGE_SIZE_OPTIONS)[number];

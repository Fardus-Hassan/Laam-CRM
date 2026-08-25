import { z } from 'zod';

export const brandColorsSchema = z.object({
  primary: z.string().min(4),
  primaryDark: z.string().min(4),
  accent: z.string().min(4),
  sidebarBgLight: z.string().min(4),
  sidebarBgDark: z.string().min(4),
  sidebarActiveBg: z.string().min(4),
  sidebarActiveFg: z.string().min(4),
  sidebarFg: z.string().min(4),
  surfaceLight: z.string().min(4),
  surfaceDark: z.string().min(4),
});

export type BrandColors = z.infer<typeof brandColorsSchema>;

/**
 * Accept legacy `sidebarBg` from older saved branding and map it onto
 * light/dark keys before validation.
 */
export function normalizeBrandColorInput(
  input: unknown,
): Partial<BrandColors> | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }
  const raw = input as Record<string, unknown>;
  const legacyBg = typeof raw.sidebarBg === 'string' ? raw.sidebarBg : undefined;
  const next: Partial<BrandColors> = {};
  for (const key of [
    'primary',
    'primaryDark',
    'accent',
    'sidebarBgLight',
    'sidebarBgDark',
    'sidebarActiveBg',
    'sidebarActiveFg',
    'sidebarFg',
    'surfaceLight',
    'surfaceDark',
  ] as const) {
    const value = raw[key];
    if (typeof value === 'string') {
      next[key] = value;
    }
  }
  if (!next.sidebarBgDark && legacyBg) {
    next.sidebarBgDark = legacyBg;
  }
  return next;
}

/** Empty string from DB/API is treated as “no logo”, not a validation error. */
const optionalLogoUrl = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().min(1).optional());

export const brandLogosSchema = z.object({
  light: optionalLogoUrl,
  dark: optionalLogoUrl,
  favicon: optionalLogoUrl,
});

export type BrandLogos = z.infer<typeof brandLogosSchema>;

/** Org-wide sidebar layout — groups, top-level items, and nested children (e.g. Settings pages). */
export const sidebarNavOrderSchema = z.object({
  groupIds: z.array(z.string().min(1)),
  itemIdsByGroup: z.record(z.string(), z.array(z.string().min(1))),
  /** Nested children under a top-level item id (settings, people, …). Orders stays separate. */
  childIdsByItem: z.record(z.string(), z.array(z.string().min(1))).optional(),
});

export type SidebarNavOrder = z.infer<typeof sidebarNavOrderSchema>;

/**
 * Fully dynamic sidebar layout (Brand settings).
 * - Sections / folders: create, rename, reorder
 * - Registry children: move / hide only (titles stay from registry / order statuses)
 * - Identity for routes stays on registry leaf ids
 */
export const sidebarNavSectionSchema = z.object({
  id: z.string().min(1),
  /** Empty label hides the section header in the sidebar. */
  label: z.string(),
});

export const sidebarNavFolderSchema = z.object({
  id: z.string().min(1),
  sectionId: z.string().min(1),
  label: z.string().min(1),
  /** Borrow icon from a registry item id when this is a custom folder. */
  iconFromId: z.string().min(1).optional(),
});

export const sidebarNavLayoutSchema = z.object({
  version: z.literal(1),
  sections: z.array(sidebarNavSectionSchema),
  folders: z.array(sidebarNavFolderSchema),
  /** Ordered registry node ids under each folder. */
  childrenByFolderId: z.record(z.string(), z.array(z.string().min(1))),
  /** Hidden registry node ids (sidebar only; deep links still work). */
  hiddenIds: z.array(z.string().min(1)).default([]),
});

export type SidebarNavSection = z.infer<typeof sidebarNavSectionSchema>;
export type SidebarNavFolder = z.infer<typeof sidebarNavFolderSchema>;
export type SidebarNavLayout = z.infer<typeof sidebarNavLayoutSchema>;

export const organizationBrandingSchema = z.object({
  colors: brandColorsSchema.partial().optional(),
  logos: brandLogosSchema.optional(),
  /** Pass `null` on update to clear a custom sidebar order (reset to defaults). */
  sidebarNavOrder: sidebarNavOrderSchema.nullish(),
  /** Pass `null` on update to clear custom layout (reset to COO PDF default). */
  sidebarNavLayout: sidebarNavLayoutSchema.nullish(),
});

export type OrganizationBranding = z.infer<typeof organizationBrandingSchema>;

export const updateOrganizationBrandingSchema = organizationBrandingSchema;

export type UpdateOrganizationBranding = z.infer<typeof updateOrganizationBrandingSchema>;

/** Public payload for login / unauthenticated tenant pages. */
export const publicTenantBrandSchema = z.object({
  name: z.string(),
  slug: z.string(),
  colors: brandColorsSchema,
  logos: z.object({
    light: optionalLogoUrl,
    dark: optionalLogoUrl,
    favicon: optionalLogoUrl,
  }),
  /** Present on authenticated branding GET/PATCH; omitted on public login payloads. */
  sidebarNavOrder: sidebarNavOrderSchema.optional(),
  sidebarNavLayout: sidebarNavLayoutSchema.optional(),
});

export type PublicTenantBrand = z.infer<typeof publicTenantBrandSchema>;

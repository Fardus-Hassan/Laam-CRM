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

export const organizationBrandingSchema = z.object({
  colors: brandColorsSchema.partial().optional(),
  logos: brandLogosSchema.optional(),
  /** Pass `null` on update to clear a custom sidebar order (reset to defaults). */
  sidebarNavOrder: sidebarNavOrderSchema.nullish(),
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
});

export type PublicTenantBrand = z.infer<typeof publicTenantBrandSchema>;

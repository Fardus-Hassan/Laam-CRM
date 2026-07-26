/** Reserved product tags for Create Order merchandising sections. */
export const MERCH_TAG_HERO = 'hero';
export const MERCH_TAG_UPSELL = 'upsell';
export const MERCH_TAG_CROSS_SELL = 'cross_sell';

export const MERCHANDISING_TAGS = [
  MERCH_TAG_HERO,
  MERCH_TAG_UPSELL,
  MERCH_TAG_CROSS_SELL,
] as const;

export type MerchandisingTag = (typeof MERCHANDISING_TAGS)[number];

export type MerchandisingFlags = {
  isHero: boolean;
  isUpsell: boolean;
  isCrossSell: boolean;
};

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase();
}

export function parseMerchandisingFlags(tags: string[] | undefined | null): MerchandisingFlags {
  const set = new Set((tags ?? []).map(normalizeTag));
  return {
    isHero: set.has(MERCH_TAG_HERO),
    isUpsell: set.has(MERCH_TAG_UPSELL),
    isCrossSell: set.has(MERCH_TAG_CROSS_SELL),
  };
}

/** Keep non-merch tags; replace merchandising flags. */
export function mergeMerchandisingTags(
  existingTags: string[] | undefined | null,
  flags: MerchandisingFlags,
): string[] {
  const reserved = new Set<string>(MERCHANDISING_TAGS);
  const other = (existingTags ?? []).filter((tag) => !reserved.has(normalizeTag(tag)));
  const next = [...other];
  if (flags.isHero) next.push(MERCH_TAG_HERO);
  if (flags.isUpsell) next.push(MERCH_TAG_UPSELL);
  if (flags.isCrossSell) next.push(MERCH_TAG_CROSS_SELL);
  return next;
}

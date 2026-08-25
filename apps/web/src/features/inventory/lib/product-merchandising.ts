/** Legacy Create Order merchandising tags — no longer shown or written. */
const LEGACY_MERCH_TAGS = new Set(['hero', 'upsell', 'cross_sell']);

export function stripMerchandisingTags(tags: string[] | undefined | null): string[] {
  return (tags ?? []).filter((tag) => !LEGACY_MERCH_TAGS.has(tag.trim().toLowerCase()));
}

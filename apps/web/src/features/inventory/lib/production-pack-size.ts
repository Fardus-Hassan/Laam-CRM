import type { ProductVariant } from '@laam/types';

/** Parse pack size from labels like `500 gm`, `500g`, `1 kg`. */
export function parseGramsFromLabel(label: string): number {
  const normalized = label.trim().toLowerCase();
  const kg = normalized.match(/([\d.]+)\s*kg\b/);
  if (kg) return Math.round(parseFloat(kg[1]) * 1000);
  const g = normalized.match(/([\d.]+)\s*(?:gm|grams?|g)\b/);
  if (g) return Math.round(parseFloat(g[1]));
  return 500;
}

/**
 * Pack size in grams for cost share.
 * Prefer explicit size in the variant label ("500 gm", "1 kg") over shipping
 * weightKg — many products keep the default 0.5kg shipping weight on every pack.
 */
export function gramsFromVariant(v: Pick<ProductVariant, 'label' | 'weightKg'>): number {
  if (/\d+(?:[.,]\d+)?\s*(?:kg|gm|grams?|g)\b/i.test(v.label)) {
    return parseGramsFromLabel(v.label);
  }
  if (typeof v.weightKg === 'number' && v.weightKg > 0) {
    return Math.round(v.weightKg * 1000);
  }
  return parseGramsFromLabel(v.label);
}

/** Prefer label pack size when showing historical batches (may have wrong gramsPerUnit). */
export function displayPackGrams(variantLabel: string, gramsPerUnit: number): number {
  if (/\d+(?:[.,]\d+)?\s*(?:kg|gm|grams?|g)\b/i.test(variantLabel)) {
    return parseGramsFromLabel(variantLabel);
  }
  return gramsPerUnit > 0 ? gramsPerUnit : parseGramsFromLabel(variantLabel);
}

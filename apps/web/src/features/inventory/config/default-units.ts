import type { UnitOfMeasure } from '@laam/types';

/** Client-side fallback when the units API is unavailable (offline / stale API build). */
export const DEFAULT_INVENTORY_UNITS: UnitOfMeasure[] = [
  { id: 'fallback-pcs', code: 'pcs', name: 'Pieces', dimension: 'count', factorToDimensionBase: 1, isSystem: true },
  { id: 'fallback-box', code: 'box', name: 'Box', dimension: 'count', factorToDimensionBase: 1, isSystem: true },
  { id: 'fallback-dozen', code: 'dozen', name: 'Dozen', dimension: 'count', factorToDimensionBase: 12, isSystem: true },
  { id: 'fallback-g', code: 'g', name: 'Gram', dimension: 'mass', factorToDimensionBase: 1, isSystem: true },
  { id: 'fallback-kg', code: 'kg', name: 'Kilogram', dimension: 'mass', factorToDimensionBase: 1000, isSystem: true },
  { id: 'fallback-mg', code: 'mg', name: 'Milligram', dimension: 'mass', factorToDimensionBase: 0.001, isSystem: true },
  { id: 'fallback-ml', code: 'ml', name: 'Millilitre', dimension: 'volume', factorToDimensionBase: 1, isSystem: true },
  { id: 'fallback-l', code: 'L', name: 'Litre', dimension: 'volume', factorToDimensionBase: 1000, isSystem: true },
  { id: 'fallback-m', code: 'm', name: 'Metre', dimension: 'length', factorToDimensionBase: 1, isSystem: true },
  { id: 'fallback-cm', code: 'cm', name: 'Centimetre', dimension: 'length', factorToDimensionBase: 0.01, isSystem: true },
];

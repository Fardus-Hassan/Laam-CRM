import type { OrderFilterPreset } from '@laam/types';

const STORAGE_KEY = 'laam-order-filter-presets';

export function loadOrderFilterPresets(): OrderFilterPreset[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OrderFilterPreset[]) : [];
  } catch {
    return [];
  }
}

export function saveOrderFilterPreset(preset: OrderFilterPreset): OrderFilterPreset[] {
  const existing = loadOrderFilterPresets();
  const next = [...existing.filter((p) => p.id !== preset.id), preset];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteOrderFilterPreset(id: string): OrderFilterPreset[] {
  const next = loadOrderFilterPresets().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

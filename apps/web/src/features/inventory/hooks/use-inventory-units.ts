'use client';

import * as React from 'react';
import type { UnitOfMeasure } from '@laam/types';

import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { DEFAULT_INVENTORY_UNITS } from '@/features/inventory/config/default-units';

export function useInventoryUnits() {
  const [units, setUnits] = React.useState<UnitOfMeasure[]>(DEFAULT_INVENTORY_UNITS);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    void inventoryApi
      .listUnits()
      .then((res) => {
        if (active && res.items.length) setUnits(res.items);
      })
      .catch(() => {
        if (active) setUnits(DEFAULT_INVENTORY_UNITS);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const unitOptions = React.useMemo(
    () =>
      units.map((unit) => ({
        value: unit.code,
        label: `${unit.code} — ${unit.name}`,
        id: unit.id,
      })),
    [units],
  );

  function defaultCode(preferred?: string | null) {
    if (preferred && units.some((u) => u.code === preferred)) return preferred;
    return units.find((u) => u.code === 'pcs')?.code ?? units[0]?.code ?? 'pcs';
  }

  function findByCode(code?: string | null) {
    if (!code) return undefined;
    return units.find((u) => u.code.toLowerCase() === code.toLowerCase());
  }

  return { units, unitOptions, loading, defaultCode, findByCode };
}

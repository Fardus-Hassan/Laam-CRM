'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import {
  getDefaultDateRange,
  toISODateRange,
} from '@/lib/date-range';

type DashboardDateContextValue = {
  range: DateRange;
  setRange: (range: DateRange | undefined) => void;
  isoRange: { from: string; to: string } | null;
};

const DashboardDateContext =
  React.createContext<DashboardDateContextValue | null>(null);

export function DashboardDateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [range, setRangeState] = React.useState<DateRange>(getDefaultDateRange);

  const setRange = React.useCallback((next: DateRange | undefined) => {
    if (next?.from) {
      setRangeState(next);
    }
  }, []);

  const isoRange = React.useMemo(() => toISODateRange(range), [range]);

  const value = React.useMemo(
    () => ({ range, setRange, isoRange }),
    [range, setRange, isoRange],
  );

  return (
    <DashboardDateContext.Provider value={value}>
      {children}
    </DashboardDateContext.Provider>
  );
}

export function useDashboardDate() {
  const context = React.useContext(DashboardDateContext);
  if (!context) {
    throw new Error('useDashboardDate must be used within DashboardDateProvider');
  }
  return context;
}

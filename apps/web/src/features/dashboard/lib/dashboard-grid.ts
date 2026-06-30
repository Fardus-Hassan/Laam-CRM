import { cn } from '@/lib/utils';

/** Dashboard section grids — items-start prevents row-equal height stretch on shorter cards. */
export function dashboardGridClass(...cols: string[]) {
  return cn(
    'grid grid-cols-1 items-start gap-3 sm:gap-4',
    ...cols,
  );
}

export const DASHBOARD_GRID_LG_12 = dashboardGridClass(
  'lg:grid-cols-2 2xl:grid-cols-12',
);

export const DASHBOARD_GRID_LG_12_SM2 = dashboardGridClass(
  'sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-12',
);

export const DASHBOARD_GRID_XL_12 = dashboardGridClass(
  'xl:grid-cols-2 2xl:grid-cols-12',
);

export const DASHBOARD_GRID_XL_5 = dashboardGridClass(
  'sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5',
);

'use client';

import type { CourierShopStats, CustomerCourierScore } from '@laam/types';

import { DataTableCourierStats } from '@/components/data-table/cells';

type CourierScoreCellProps = {
  score: CustomerCourierScore;
  shop?: CourierShopStats | null;
  orderCount?: number;
  deliveredCount?: number;
  compact?: boolean;
  className?: string;
};

export function CourierScoreCell({
  score,
  shop,
  orderCount,
  deliveredCount,
  compact,
  className,
}: CourierScoreCellProps) {
  return (
    <DataTableCourierStats
      className={className}
      compact={compact}
      shop={
        shop ?? {
          to: orderCount ?? score.total,
          co: deliveredCount ?? score.success,
        }
      }
      network={{
        to: score.total,
        co: Math.max(0, score.total - score.success - score.failed),
        su: score.success,
        fa: score.failed,
        percent: score.rate,
        label: '—',
      }}
    />
  );
}

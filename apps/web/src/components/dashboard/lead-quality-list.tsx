import type { LeadQualityRow } from '@laam/types';

import { cn } from '@/lib/utils';

const QUALITY_COLORS = {
  high: '#28B463',
  medium: '#F39C12',
  low: '#FF4D4D',
} as const;

type LeadQualityListProps = {
  rows: LeadQualityRow[];
  className?: string;
};

function toPercentages(row: LeadQualityRow) {
  const total = row.high + row.medium + row.low;

  if (total <= 100 && total > 0) {
    return {
      high: row.high,
      medium: row.medium,
      low: row.low,
    };
  }

  return {
    high: Math.round((row.high / total) * 100),
    medium: Math.round((row.medium / total) * 100),
    low: Math.round((row.low / total) * 100),
  };
}

export function LeadQualityList({ rows, className }: LeadQualityListProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs sm:text-sm">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: QUALITY_COLORS.high }}
          />
          High Quality
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: QUALITY_COLORS.medium }}
          />
          Medium Quality
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: QUALITY_COLORS.low }}
          />
          Low Quality
        </span>
      </div>

      <ul className="space-y-3.5">
        {rows.map((row) => {
          const percents = toPercentages(row);
          const segments = [
            { key: 'high', value: percents.high, color: QUALITY_COLORS.high },
            { key: 'medium', value: percents.medium, color: QUALITY_COLORS.medium },
            { key: 'low', value: percents.low, color: QUALITY_COLORS.low },
          ] as const;

          return (
            <li key={row.id} className="flex items-center gap-3">
              <span className="w-[7.5rem] shrink-0 truncate text-xs text-foreground sm:w-32 sm:text-sm">
                {row.source}
              </span>
              <div className="flex min-w-0 flex-1 gap-1">
                {segments.map((segment) =>
                  segment.value > 0 ? (
                    <div
                      key={segment.key}
                      className="flex h-7 min-w-[2.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white sm:h-8 sm:text-xs"
                      style={{
                        flexGrow: segment.value,
                        flexBasis: 0,
                        backgroundColor: segment.color,
                      }}
                    >
                      {segment.value}%
                    </div>
                  ) : null,
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

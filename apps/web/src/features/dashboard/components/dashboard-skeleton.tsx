import {
  DASHBOARD_GRID_LG_12,
  DASHBOARD_GRID_LG_12_SM2,
} from '@/features/dashboard/lib/dashboard-grid';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function DashboardCardSkeleton({
  className,
  contentClassName,
  children,
}: {
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn('@container h-fit w-full gap-0 py-0 shadow-none', className)}>
      <div className="flex items-center justify-between gap-3 border-b px-3 py-3 sm:px-5">
        <Skeleton className="h-4 w-28 sm:w-36" />
        <Skeleton className="h-7 w-20 rounded-md" />
      </div>
      <CardContent className={cn('px-3 py-3 sm:px-5 sm:py-3', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

function KpiSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 sm:snap-none lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="min-w-[72%] shrink-0 snap-start gap-0 py-4 shadow-none sm:min-w-0 sm:shrink"
        >
          <CardContent className="space-y-3 px-4">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LineChartSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex h-[200px] items-end gap-1.5 px-1 sm:h-[240px] sm:gap-2">
        {[42, 58, 48, 72, 64, 80, 55].map((height, index) => (
          <Skeleton
            key={index}
            className="flex-1 rounded-t-sm"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="flex justify-center gap-4 border-t border-border/70 pt-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  );
}

function DonutChartSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 @min-[26rem]:flex-row @min-[26rem]:items-center">
      <Skeleton className="size-[148px] shrink-0 rounded-full sm:size-[160px]" />
      <div className="w-full min-w-0 flex-1 space-y-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-2">
            <Skeleton className="size-2.5 shrink-0 rounded-full" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChartSkeleton() {
  return (
    <div className="flex h-[200px] items-end gap-2 px-1 sm:h-[240px] sm:gap-3">
      {[55, 48, 72, 64, 68, 78].map((height, index) => (
        <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="w-full rounded-t-sm" style={{ height: `${height}%` }} />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3 border-b border-border/60 pb-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="hidden h-3 w-14 sm:block" />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="hidden h-5 w-16 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="flex gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
        >
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-full max-w-[240px]" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StorageSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Skeleton className="size-[148px] rounded-full" />
      <div className="grid w-full grid-cols-3 gap-2 border-t border-border/70 pt-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-1.5 text-center">
            <Skeleton className="mx-auto h-3 w-12" />
            <Skeleton className="mx-auto h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-5 w-44 sm:h-6 sm:w-56" />
          <Skeleton className="h-3 w-full max-w-md" />
        </div>
        <Skeleton className="h-9 w-full rounded-md sm:w-48" />
      </div>

      <KpiSkeletonGrid count={6} />

      <div className={DASHBOARD_GRID_LG_12}>
        <DashboardCardSkeleton className="min-w-0 lg:col-span-2 2xl:col-span-6">
          <LineChartSkeleton />
        </DashboardCardSkeleton>

        <DashboardCardSkeleton className="min-w-0 lg:col-span-1 2xl:col-span-3">
          <DonutChartSkeleton />
        </DashboardCardSkeleton>

        <DashboardCardSkeleton className="min-w-0 lg:col-span-1 2xl:col-span-3">
          <DonutChartSkeleton />
        </DashboardCardSkeleton>
      </div>

      <div className={DASHBOARD_GRID_LG_12}>
        <DashboardCardSkeleton className="min-w-0 lg:col-span-1 2xl:col-span-4">
          <BarChartSkeleton />
        </DashboardCardSkeleton>

        <DashboardCardSkeleton
          className="min-w-0 lg:col-span-2 2xl:col-span-5"
          contentClassName="pt-0"
        >
          <TableSkeleton rows={5} />
        </DashboardCardSkeleton>

        <DashboardCardSkeleton className="min-w-0 lg:col-span-1 2xl:col-span-3">
          <ListSkeleton items={5} />
        </DashboardCardSkeleton>
      </div>

      <div className={DASHBOARD_GRID_LG_12_SM2}>
        <DashboardCardSkeleton
          className="min-w-0 sm:col-span-2 2xl:col-span-4"
          contentClassName="pt-0"
        >
          <TableSkeleton rows={4} />
        </DashboardCardSkeleton>

        <DashboardCardSkeleton className="min-w-0 2xl:col-span-3">
          <ListSkeleton items={4} />
        </DashboardCardSkeleton>

        <DashboardCardSkeleton className="min-w-0 2xl:col-span-3">
          <DonutChartSkeleton />
        </DashboardCardSkeleton>

        <DashboardCardSkeleton className="min-w-0 2xl:col-span-2">
          <StorageSkeleton />
        </DashboardCardSkeleton>
      </div>
    </div>
  );
}

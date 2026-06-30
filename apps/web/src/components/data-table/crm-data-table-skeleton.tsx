import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function CrmDataTableSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3 px-4 py-4', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

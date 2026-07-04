import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

type TableProgressCellProps = {
  value: number;
  className?: string;
};

export function TableProgressCell({ value, className }: TableProgressCellProps) {
  return (
    <div className={cn('flex min-w-[100px] items-center gap-2', className)}>
      <Progress value={value} className="h-1.5 flex-1" />
      <span className="w-9 text-right text-xs font-medium">{value}%</span>
    </div>
  );
}

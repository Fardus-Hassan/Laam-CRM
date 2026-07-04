import { cn } from '@/lib/utils';

type StatCardProps = {
  label: string;
  value: string | number;
  className?: string;
};

export function StatCard({ label, value, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-muted/40 p-4',
        className,
      )}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

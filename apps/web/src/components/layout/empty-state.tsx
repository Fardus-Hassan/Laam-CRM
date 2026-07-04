import { cn } from '@/lib/utils';

type EmptyStateProps = {
  title: string;
  description: string;
  className?: string;
  compact?: boolean;
};

export function EmptyState({ title, description, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-1 items-center justify-center rounded-xl border border-dashed bg-muted/20 p-6 sm:p-8',
        compact ? 'min-h-[8rem]' : 'min-h-[40vh] sm:min-h-[50vh]',
        className,
      )}
    >
      <div className="max-w-md text-center">
        <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

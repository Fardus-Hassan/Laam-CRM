import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';

type DashboardCardProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function DashboardCard({
  title,
  description,
  action,
  footer,
  children,
  className,
  contentClassName,
}: DashboardCardProps) {
  return (
    <Card className={cn('@container h-fit w-full gap-0 py-0 shadow-none', className)}>
      <div className="flex items-start justify-between gap-3 border-b px-3 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-semibold leading-snug text-balance">
            {title}
          </CardTitle>
          {description ? (
            <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>
          ) : null}
        </div>
        {action ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {action}
          </div>
        ) : null}
      </div>
      <CardContent
        className={cn('px-3 py-3 sm:px-5 sm:py-3', contentClassName)}
      >
        {children}
        {footer}
      </CardContent>
    </Card>
  );
}

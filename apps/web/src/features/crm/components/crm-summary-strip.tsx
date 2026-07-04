import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export type CrmSummaryItem = {
  id: string;
  label: string;
  value: string;
  hint?: string;
};

type CrmSummaryStripProps = {
  items: CrmSummaryItem[];
  className?: string;
};

export function CrmSummaryStrip({ items, className }: CrmSummaryStripProps) {
  return (
    <div className={cn('grid min-w-0 grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4', className)}>
      {items.map((item) => (
        <Card key={item.id} className="min-w-0 gap-0 py-3 shadow-none sm:py-4">
          <CardContent className="px-3 sm:px-4">
            <p className="truncate text-[11px] font-medium text-muted-foreground sm:text-xs">{item.label}</p>
            <p className="mt-1 truncate text-lg font-bold tracking-tight sm:text-2xl">{item.value}</p>
            {item.hint ? (
              <p className="mt-1 truncate text-[11px] text-muted-foreground sm:text-xs">{item.hint}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

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
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {items.map((item) => (
        <Card key={item.id} className="gap-0 py-4 shadow-none">
          <CardContent className="px-4">
            <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{item.value}</p>
            {item.hint ? (
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

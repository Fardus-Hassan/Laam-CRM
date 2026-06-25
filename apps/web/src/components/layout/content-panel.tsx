import { cn } from '@/lib/utils';

type ContentPanelProps = React.ComponentProps<'section'>;

export function ContentPanel({ className, ...props }: ContentPanelProps) {
  return (
    <section
      className={cn('rounded-xl border bg-muted/20 p-6', className)}
      {...props}
    />
  );
}

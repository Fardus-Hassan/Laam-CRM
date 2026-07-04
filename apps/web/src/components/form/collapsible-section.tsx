'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type CollapsibleSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const contentId = React.useId();

  return (
    <Card className={cn('gap-0 overflow-hidden py-0 shadow-none', className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 border-b px-4 py-2 !pb-2 text-left transition-colors hover:bg-muted/30"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate text-sm font-semibold whitespace-nowrap">{title}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out',
            open && 'rotate-180',
          )}
        />
      </button>
      <div
        id={contentId}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-70',
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="p-3 pt-2">{children}</CardContent>
        </div>
      </div>
    </Card>
  );
}

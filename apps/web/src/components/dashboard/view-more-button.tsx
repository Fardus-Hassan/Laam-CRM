'use client';

import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type ViewMoreButtonProps = {
  onClick: () => void;
  remainingCount?: number;
  className?: string;
  label?: string;
};

export function ViewMoreButton({
  onClick,
  remainingCount,
  className,
  label = 'View more',
}: ViewMoreButtonProps) {
  const text =
    remainingCount && remainingCount > 0
      ? `${label} (${remainingCount})`
      : label;

  return (
    <div className={cn('border-t border-border/70 pt-3', className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-full justify-center gap-1 text-xs font-medium text-primary hover:text-primary dark:hover:bg-white/10 dark:hover:text-primary"
        onClick={onClick}
      >
        {text}
        <ChevronRight className="size-3.5" />
      </Button>
    </div>
  );
}

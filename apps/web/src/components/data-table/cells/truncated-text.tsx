'use client';

import type { ReactNode } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function TruncatedText({
  children,
  className,
  lines = 2,
}: {
  children: ReactNode;
  className?: string;
  lines?: 1 | 2 | 3;
}) {
  const text = typeof children === 'string' ? children : null;
  const clampClass =
    lines === 1 ? 'line-clamp-1' : lines === 3 ? 'line-clamp-3' : 'line-clamp-2';

  if (!text) {
    return <div className={cn(clampClass, className)}>{children}</div>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <p className={cn(clampClass, 'cursor-default text-left', className)}>{text}</p>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-left">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

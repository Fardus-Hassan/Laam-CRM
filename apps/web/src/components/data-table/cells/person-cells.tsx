'use client';

import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function DataTableDateTime({
  prefix,
  value,
  formatter,
  className,
}: {
  prefix?: string;
  value: string;
  formatter: (value: string) => string;
  className?: string;
}) {
  return (
    <p className={cn('text-xs tabular-nums', className)}>
      {prefix ? <span className="font-medium text-muted-foreground">{prefix}</span> : null}
      {prefix ? ' ' : null}
      <span className="whitespace-nowrap">{formatter(value)}</span>
    </p>
  );
}

export function DataTablePersonCell({
  name,
  phone,
  sourceLabel,
  phoneSlot,
  className,
  /**
   * Dense table layout: name + source on one line, tighter vertical gap.
   * Does not shrink font or control sizes.
   */
  compact = false,
}: {
  name: string;
  phone?: string;
  sourceLabel?: string;
  phoneSlot?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn(compact ? 'flex min-w-0 flex-col gap-1' : 'space-y-1.5', className)}>
      <div
        className={cn(
          'min-w-0',
          compact && sourceLabel
            ? 'flex flex-wrap items-baseline gap-x-1.5 gap-y-0'
            : undefined,
        )}
      >
        <p className="text-sm font-medium leading-snug">{name}</p>
        {sourceLabel && compact ? (
          <span className="text-[10px] leading-none text-muted-foreground">{sourceLabel}</span>
        ) : null}
      </div>
      {phoneSlot ?? (phone ? <p className="text-xs text-muted-foreground">{phone}</p> : null)}
      {sourceLabel && !compact ? (
        <Badge variant="secondary" className="text-[10px] font-normal">
          {sourceLabel}
        </Badge>
      ) : null}
    </div>
  );
}

/** Parse `"Name (email@x.com)"` labels used for assigned agents. */
export function parseAgentDisplayLabel(raw: string): { name: string; email?: string } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.+?)\s*\(([^)]+@[^)]+)\)\s*$/);
  if (match) {
    return { name: match[1]!.trim(), email: match[2]!.trim() };
  }
  return { name: trimmed };
}

/**
 * Employee name only; email (if present) on hover. Name wraps; never underlays the copy icon.
 */
export function DataTableEmployeeCell({
  label,
  email: emailProp,
  className,
}: {
  /** Display label, optionally `"Name (email)"`. */
  label: string;
  email?: string;
  className?: string;
}) {
  const parsed = parseAgentDisplayLabel(label);
  const name = parsed.name;
  const email = emailProp?.trim() || parsed.email;
  const nameEl = (
    <span className="block min-w-0 text-sm font-medium leading-snug break-words [overflow-wrap:anywhere]">
      {name}
    </span>
  );

  if (!email) {
    return <div className={cn('min-w-0 max-w-full', className)}>{nameEl}</div>;
  }

  return (
    <div className={cn('min-w-0 max-w-full', className)}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="block w-full min-w-0 max-w-full cursor-default border-0 bg-transparent p-0 text-left"
            >
              {nameEl}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium">{name}</p>
            <p className="opacity-80">{email}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

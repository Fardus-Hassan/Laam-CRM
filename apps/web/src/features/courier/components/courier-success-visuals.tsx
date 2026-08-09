'use client';

import { cn } from '@/lib/utils';

/** Shared success-rate ring — brand primary only. */
export function CourierSuccessRing({
  percent,
  size = 36,
  strokeWidth = 3.5,
  showLabel = true,
  className,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const p = Math.min(100, Math.max(0, percent));
  const view = 36;
  const r = (view - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (p / 100) * c;

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${view} ${view}`} className="size-full -rotate-90">
        <circle
          cx={view / 2}
          cy={view / 2}
          r={r}
          fill="none"
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={view / 2}
          cy={view / 2}
          r={r}
          fill="none"
          className="stroke-primary transition-[stroke-dashoffset]"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      {showLabel ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold tabular-nums leading-none text-foreground">
            {Math.round(p)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * BD Courier logos are wide wordmarks (~3:1–6:1), often drawn for dark plates.
 * Use a light plate + object-contain so marks stay readable on any theme.
 */
export function CourierLogoStrip({
  src,
  label,
  className,
}: {
  src?: string | null;
  label: string;
  className?: string;
}) {
  if (src) {
    return (
      <div
        className={cn(
          'flex h-10 w-full items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-white px-2.5 dark:bg-zinc-100',
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={label}
          className="max-h-7 w-full object-contain object-center"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex h-10 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-2',
        className,
      )}
    >
      <span className="truncate text-[11px] font-semibold tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function CourierHistorySkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse space-y-2.5 rounded-xl border border-border/70 bg-card p-3"
        >
          <div className="h-10 rounded-lg bg-muted" />
          <div className="mx-auto h-7 w-16 rounded bg-muted" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-8 rounded bg-muted/70" />
            <div className="h-8 rounded bg-muted/70" />
            <div className="h-8 rounded bg-muted/70" />
          </div>
          <div className="h-1 rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

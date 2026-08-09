'use client';

import { cn } from '@/lib/utils';

type SessionBootScreenProps = {
  className?: string;
  message?: string;
  onRetry?: () => void;
};

/**
 * Neutral full-viewport boot — light white / dark #1E1E1E so it never clashes
 * with tenant brand colors before logos are applied.
 */
export function SessionBootScreen({
  className,
  message = 'Loading your workspace…',
  onRetry,
}: SessionBootScreenProps) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 dark:bg-[#1E1E1E]',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex size-11 items-center justify-center rounded-xl border border-black/10 bg-black/[0.04] shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="size-2.5 animate-pulse rounded-full bg-black/35 dark:bg-white/50" />
      </div>
      <p className="text-sm text-black/50 dark:text-white/55">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium text-black/70 transition-colors hover:bg-black/[0.04] dark:border-white/15 dark:text-white/80 dark:hover:bg-white/5"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

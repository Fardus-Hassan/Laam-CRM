'use client';

import { cn } from '@/lib/utils';

type SessionBootScreenProps = {
  className?: string;
  message?: string;
};

/** Full-viewport boot state — never flash the login form while restoring session. */
export function SessionBootScreen({
  className,
  message = 'Loading your workspace…',
}: SessionBootScreenProps) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
        <div className="size-5 animate-pulse rounded-md bg-primary/70" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

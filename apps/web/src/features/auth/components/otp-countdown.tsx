'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';

import { cn } from '@/lib/utils';

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

type OtpCountdownProps = {
  expiresAt: string;
  resendAfter: string;
  onResend?: () => void | Promise<void>;
  resendLabel?: string;
  className?: string;
};

export function OtpCountdown({
  expiresAt,
  resendAfter,
  onResend,
  resendLabel = 'Resend code',
  className,
}: OtpCountdownProps) {
  const [now, setNow] = React.useState(() => Date.now());
  const [resending, setResending] = React.useState(false);

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const expiresMs = new Date(expiresAt).getTime() - now;
  const resendMs = new Date(resendAfter).getTime() - now;
  const canResend = resendMs <= 0;
  const expired = expiresMs <= 0;

  async function handleResend() {
    if (!onResend || !canResend || resending) {
      return;
    }
    setResending(true);
    try {
      await onResend();
    } finally {
      setResending(false);
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2 text-sm', className)}>
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
          expired
            ? 'bg-destructive/10 text-destructive'
            : 'bg-muted text-muted-foreground',
        )}
      >
        <Clock className="size-3.5" />
        {expired ? 'Code expired' : `Expires in ${formatRemaining(expiresMs)}`}
      </div>

      {onResend ? (
        <button
          type="button"
          disabled={!canResend || resending}
          onClick={() => void handleResend()}
          className={cn(
            'font-medium transition-colors',
            canResend
              ? 'text-primary hover:underline'
              : 'cursor-not-allowed text-muted-foreground',
          )}
        >
          {resending
            ? 'Sending…'
            : canResend
              ? resendLabel
              : `Resend in ${formatRemaining(resendMs)}`}
        </button>
      ) : null}
    </div>
  );
}

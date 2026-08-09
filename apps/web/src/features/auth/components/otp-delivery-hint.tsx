'use client';

import { Inbox, Mail } from 'lucide-react';
import type { OtpDelivery } from '@laam/types';

import { cn } from '@/lib/utils';

type OtpDeliveryHintProps = {
  delivery: OtpDelivery;
  message?: string;
  devOtp?: string;
  className?: string;
};

export function OtpDeliveryHint({ delivery, message, devOtp, className }: OtpDeliveryHintProps) {
  const isEmail = delivery === 'email';

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5 text-sm',
        isEmail
          ? 'border-primary/20 bg-primary/5 text-foreground'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        {isEmail ? (
          <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
        ) : (
          <Inbox className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        )}
        <div className="space-y-1">
          <p className="font-medium">
            {isEmail ? 'Check your email' : 'Ask your Organization Admin'}
          </p>
          <p className="text-xs opacity-90">
            {message ??
              (isEmail
                ? 'We sent a 6-digit code to your inbox. It expires in 5 minutes.'
                : 'Your OTP is in the Org Admin Security inbox — not sent to your email.')}
          </p>
          {devOtp ? (
            <p className="rounded bg-background/80 px-2 py-1 font-mono text-xs">
              Dev OTP: <strong>{devOtp}</strong>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

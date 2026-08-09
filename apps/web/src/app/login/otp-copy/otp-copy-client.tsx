'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { env } from '@/config/env';
import { AuthBrandShell } from '@/features/auth/components/auth-brand-shell';
import { apiRequest } from '@/lib/api/client';
import { authEndpoints } from '@/lib/api/endpoints';
import { parseApiErrorMessage } from '@/lib/api/parse-api-error';

type OtpCopyResponse = {
  code: string;
  email: string | null;
};

export default function OtpCopyPageClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('t');
  const [code, setCode] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const copyToClipboard = React.useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Verification code copied');
    window.setTimeout(() => setCopied(false), 2500);
  }, []);

  React.useEffect(() => {
    if (!token) {
      setError('Invalid copy link');
      setLoading(false);
      return;
    }

    if (!env.useApi) {
      setError('API mode is required');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const data = await apiRequest<OtpCopyResponse>(
          `${authEndpoints.otpCopy}?token=${encodeURIComponent(token!)}`,
        );
        if (cancelled) {
          return;
        }
        setCode(data.code);
        try {
          await copyToClipboard(data.code);
        } catch {
          // User can tap the copy button manually
        }
      } catch (err) {
        if (!cancelled) {
          setError(parseApiErrorMessage(err, 'Could not load verification code'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, copyToClipboard]);

  return (
    <AuthBrandShell
      title="Your verification code"
      subtitle="Copy the code, then paste it on the sign-in or reset page."
    >
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
          Loading code…
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!loading && code ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-muted/25 px-4 py-8 text-center">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              One-time code
            </p>
            <p className="font-mono text-4xl font-bold tracking-[0.35em] text-primary tabular-nums sm:text-5xl">
              {code}
            </p>
          </div>

          <Button
            type="button"
            className="h-11 w-full text-sm font-semibold"
            size="lg"
            onClick={() => void copyToClipboard(code)}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copied' : 'Copy code'}
          </Button>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Return to the other tab and paste the code into the verification field.
          </p>
        </div>
      ) : null}

      <Button type="button" variant="outline" className="mt-2 h-10 w-full" asChild>
        <Link href="/login">Back to sign in</Link>
      </Button>
    </AuthBrandShell>
  );
}

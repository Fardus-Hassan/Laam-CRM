'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, Copy, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <AuthBrandShell subtitle="Your OTP is ready to paste on the login page.">
      <Card className="w-full border-border/70 shadow-xl backdrop-blur-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10">
            <KeyRound className="size-5 text-primary" />
          </div>
          <CardTitle className="text-xl">Copy verification code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-8 text-sm text-muted-foreground">
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
            <>
              <div className="rounded-xl border bg-muted/40 px-4 py-6 text-center">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Your code
                </p>
                <p className="font-mono text-4xl font-bold tracking-[0.35em] text-primary tabular-nums">
                  {code}
                </p>
              </div>

              <Button
                type="button"
                className="w-full"
                size="lg"
                onClick={() => void copyToClipboard(code)}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Copied!' : 'Copy code again'}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Go back to the login tab and paste the code, or use the paste button next to the
                OTP field.
              </p>
            </>
          ) : null}

          <Button type="button" variant="outline" className="w-full" asChild>
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthBrandShell>
  );
}

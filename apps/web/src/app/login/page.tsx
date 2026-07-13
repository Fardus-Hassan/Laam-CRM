'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Fingerprint, LogIn } from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stepper } from '@/components/ui/stepper';
import { env } from '@/config/env';
import { passwordApi } from '@/features/auth/api/password-api';
import { OtpCountdown } from '@/features/auth/components/otp-countdown';
import { OtpDeliveryHint } from '@/features/auth/components/otp-delivery-hint';
import { OtpInput } from '@/features/auth/components/otp-input';
import { SessionBootScreen } from '@/features/auth/components/session-boot-screen';
import {
  defaultPostLoginPath,
  safeNextPath,
} from '@/features/auth/lib/auth-redirect';
import { isDeviceOtpChallenge } from '@/features/auth/types';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { parseApiErrorMessage } from '@/lib/api/parse-api-error';
import { navigateAfterAuth, setStoredAccessToken } from '@/lib/auth-token';
import { getTenantSlugFromHost, isPlatformHost } from '@/lib/tenant';
import type { DeviceOtpChallenge } from '@/features/auth/types';

const STEPS = [
  { id: 'credentials', label: 'Sign in' },
  { id: 'device', label: 'Verify device' },
];

function LoginPageContent() {
  const searchParams = useSearchParams();
  const { login, loginVerifyDevice, status, user, isAuthenticated } = useAuth();
  const [step, setStep] = React.useState(1);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [otpCode, setOtpCode] = React.useState('');
  const [deviceChallenge, setDeviceChallenge] = React.useState<DeviceOtpChallenge | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const tenantSlug = getTenantSlugFromHost();
  const platform = isPlatformHost();
  const nextPath = safeNextPath(searchParams.get('next'));
  const redirected = React.useRef(false);

  const redirectAfterLogin = React.useCallback(
    (role: string) => {
      if (redirected.current) {
        return;
      }
      redirected.current = true;
      setLeaving(true);
      navigateAfterAuth(nextPath ?? defaultPostLoginPath(role));
    },
    [nextPath],
  );

  React.useEffect(() => {
    if (!env.useApi || status === 'loading' || !isAuthenticated || !user || step > 1) {
      return;
    }
    redirectAfterLogin(user.role);
  }, [status, isAuthenticated, user, step, redirectAfterLogin]);

  async function handleCredentials(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStoredAccessToken(null);
    try {
      const result = await login(email.trim(), password);
      if (isDeviceOtpChallenge(result)) {
        setDeviceChallenge(result);
        setStep(2);
        toast.message('Verify this device to continue');
        return;
      }
      toast.success('Signed in');
      redirectAfterLogin(result.user.role);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeviceVerify(event: React.FormEvent) {
    event.preventDefault();
    if (!deviceChallenge) {
      return;
    }
    setLoading(true);
    try {
      const session = await loginVerifyDevice(deviceChallenge.email, otpCode);
      toast.success('Device verified — welcome back');
      redirectAfterLogin(session.user.role);
    } catch (error) {
      toast.error(parseApiErrorMessage(error, 'Verification failed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendDeviceOtp() {
    if (!deviceChallenge?.challengeId) {
      return;
    }
    const result = await passwordApi.resendOtp(deviceChallenge.challengeId);
    setDeviceChallenge({ ...deviceChallenge, ...result });
    toast.success('New code sent');
  }

  if (!env.useApi) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>API mode off</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Set <code className="rounded bg-muted px-1">NEXT_PUBLIC_USE_API=true</code> in{' '}
              <code className="rounded bg-muted px-1">.env</code>, then restart the web app.
            </p>
            <Button type="button" variant="outline" asChild className="w-full">
              <Link href="/dashboard">Continue with demo (mock auth)</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'loading' || leaving || (isAuthenticated && step === 1)) {
    return <SessionBootScreen message="Loading your workspace…" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-muted/50 to-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
            {step === 1 ? (
              <LogIn className="size-5 text-primary" />
            ) : (
              <Fingerprint className="size-5 text-primary" />
            )}
          </div>
          <div>
            <CardTitle className="text-xl">{platform ? 'Laam Platform' : `${tenantSlug} CRM`}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === 1
                ? platform
                  ? 'Super admin — sign in at localhost (not a company subdomain).'
                  : `Company sign in — ${tenantSlug}.localhost`
                : 'New device detected — enter the verification code'}
            </p>
          </div>
          <Stepper steps={STEPS} currentStep={step} />
          {!platform && step === 1 ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-800 dark:text-amber-200">
              Super admin account works only on{' '}
              <Link href="http://localhost:3000/login" className="font-medium underline">
                localhost:3000/login
              </Link>
              . Use tenant owner credentials here.
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form className="space-y-4" onSubmit={(e) => void handleCredentials(e)}>
              <FormField label="Email" required>
                <FormInput
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="crm.laam@gmail.com"
                />
              </FormField>
              <FormField label="Password" required>
                <FormInput
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormField>
              <div className="flex justify-end">
                <Link
                  href="/login/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={(e) => void handleDeviceVerify(e)}>
              {deviceChallenge ? (
                <>
                  <OtpDeliveryHint
                    delivery={deviceChallenge.delivery}
                    message={deviceChallenge.message}
                    devOtp={deviceChallenge.devOtp}
                  />
                  <OtpCountdown
                    expiresAt={deviceChallenge.expiresAt}
                    resendAfter={deviceChallenge.resendAfter}
                    onResend={handleResendDeviceOtp}
                  />
                </>
              ) : null}
              <FormField label="Device verification code" required>
                <OtpInput value={otpCode} onChange={setOtpCode} autoFocus />
              </FormField>
              <Button type="submit" className="w-full" disabled={loading || otpCode.length < 6}>
                {loading ? 'Verifying…' : 'Verify & sign in'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep(1);
                  setOtpCode('');
                  setDeviceChallenge(null);
                }}
              >
                Back to sign in
              </Button>
            </form>
          )}
          {platform && step === 1 ? (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Tenant admin? Open{' '}
              <Link href="http://laam.localhost:3000/login" className="text-primary underline">
                laam.localhost:3000/login
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<SessionBootScreen />}>
      <LoginPageContent />
    </React.Suspense>
  );
}

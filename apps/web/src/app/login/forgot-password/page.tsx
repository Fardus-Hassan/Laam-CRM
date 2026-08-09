'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
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
import { AuthBrandShell } from '@/features/auth/components/auth-brand-shell';
import { useBrand } from '@/features/brand/providers/brand-provider';
import { parseApiErrorMessage } from '@/lib/api/parse-api-error';
import { getTenantSlugFromHost, isPlatformHost } from '@/lib/tenant';
import type { OtpChallengeResponse } from '@laam/types';

const STEPS = [
  { id: 'email', label: 'Email' },
  { id: 'verify', label: 'Verify' },
  { id: 'reset', label: 'New password' },
];

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [resetToken, setResetToken] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [challenge, setChallenge] = React.useState<OtpChallengeResponse | null>(null);

  const tenantSlug = getTenantSlugFromHost();
  const platform = isPlatformHost();
  const brand = useBrand();

  async function handleRequestOtp(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await passwordApi.forgotPassword(email.trim());
      setChallenge(result);
      setStep(2);
      toast.success('Verification code sent');
    } catch (error) {
      toast.error(parseApiErrorMessage(error, 'Could not send reset code'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!challenge?.challengeId) {
      return;
    }
    const result = await passwordApi.resendForgotPassword(challenge.challengeId);
    setChallenge(result);
    toast.success('New code sent');
  }

  async function handleVerifyOtp(event: React.FormEvent) {
    event.preventDefault();
    if (code.length < 6) {
      toast.error('Enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const result = await passwordApi.verifyForgotPasswordCode(email.trim(), code);
      setResetToken(result.resetToken);
      setStep(3);
      toast.success('Code verified — set your new password');
    } catch (error) {
      toast.error(parseApiErrorMessage(error, 'Invalid or expired code'));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await passwordApi.resetPasswordWithToken(resetToken, newPassword);
      toast.success('Password updated — you can sign in now');
      router.push('/login');
    } catch (error) {
      toast.error(parseApiErrorMessage(error, 'Could not reset password'));
    } finally {
      setLoading(false);
    }
  }

  if (!env.useApi) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>API mode required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Enable API mode to use password reset.</p>
            <Button type="button" variant="outline" asChild className="w-full">
              <Link href="/login">Back to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stepSubtitles = [
    `We'll send a verification code for your ${brand.name} account.`,
    'Enter the 6-digit code to continue.',
    'Choose a new password for your account.',
  ];

  return (
    <AuthBrandShell
      title="Reset password"
      subtitle={stepSubtitles[step - 1]}
      footer={
        <p>
          {platform ? 'Platform account' : tenantSlug ? `${tenantSlug} workspace` : 'Workspace'}
        </p>
      }
    >
      <Stepper steps={STEPS} currentStep={step} className="mb-2" />

      {step === 1 ? (
        <form className="space-y-4" onSubmit={(e) => void handleRequestOtp(e)}>
          <FormField label="Email" required>
            <FormInput
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="h-10"
            />
          </FormField>
          <Button type="submit" size="lg" className="h-11 w-full text-sm font-semibold" disabled={loading}>
            {loading ? 'Sending…' : 'Send verification code'}
          </Button>
        </form>
      ) : null}

      {step === 2 ? (
        <form className="space-y-4" onSubmit={(e) => void handleVerifyOtp(e)}>
          {challenge ? (
            <>
              <OtpDeliveryHint
                delivery={challenge.delivery}
                message={challenge.message}
                devOtp={challenge.devOtp}
              />
              <OtpCountdown
                expiresAt={challenge.expiresAt}
                resendAfter={challenge.resendAfter}
                onResend={handleResend}
              />
            </>
          ) : null}

          <FormField label="Verification code" required>
            <OtpInput value={code} onChange={setCode} autoFocus />
          </FormField>
          <Button
            type="submit"
            size="lg"
            className="h-11 w-full text-sm font-semibold"
            disabled={loading || code.length < 6}
          >
            {loading ? 'Verifying…' : 'Verify code'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setStep(1);
              setCode('');
              setChallenge(null);
            }}
          >
            Use a different email
          </Button>
        </form>
      ) : null}

      {step === 3 ? (
        <form className="space-y-4" onSubmit={(e) => void handleReset(e)}>
          <p className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
            Verified <span className="font-medium text-foreground">{email}</span>
          </p>
          <FormField label="New password" required>
            <FormInput
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="h-10"
              autoFocus
            />
          </FormField>
          <FormField label="Confirm password" required>
            <FormInput
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-10"
            />
          </FormField>
          <Button type="submit" size="lg" className="h-11 w-full text-sm font-semibold" disabled={loading}>
            <ShieldCheck className="size-4" />
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      ) : null}

      <Button type="button" variant="link" className="mt-2 h-auto w-full px-0 text-muted-foreground" asChild>
        <Link href="/login">
          <ArrowLeft className="size-3.5" />
          Back to sign in
        </Link>
      </Button>
    </AuthBrandShell>
  );
}

'use client';

import * as React from 'react';
import { LockKeyhole, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stepper } from '@/components/ui/stepper';
import { passwordApi } from '@/features/auth/api/password-api';
import { OtpCountdown } from '@/features/auth/components/otp-countdown';
import { OtpDeliveryHint } from '@/features/auth/components/otp-delivery-hint';
import { OtpInboxPanel } from '@/features/auth/components/otp-inbox-panel';
import { OtpInput } from '@/features/auth/components/otp-input';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { parseApiErrorMessage } from '@/lib/api/parse-api-error';
import type { OtpChallengeResponse } from '@laam/types';

const STEPS = [
  { id: 'password', label: 'New password' },
  { id: 'verify', label: 'Verify OTP' },
];

export function SecuritySettingsPage() {
  const { user } = useAuth();
  const [step, setStep] = React.useState(1);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [challenge, setChallenge] = React.useState<OtpChallengeResponse | null>(null);

  const isOrgAdmin = user?.role === 'org_admin';

  async function handleStartChange(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await passwordApi.changePassword(currentPassword, newPassword);
      setChallenge(result);
      setStep(2);
      toast.success('Verification code sent');
    } catch (error) {
      toast.error(parseApiErrorMessage(error, 'Could not start password change'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!challenge?.challengeId) {
      return;
    }
    const result = await passwordApi.resendOtp(challenge.challengeId);
    setChallenge(result);
    toast.success('New code sent');
  }

  async function handleConfirm(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await passwordApi.confirmChangePassword(code, newPassword);
      toast.success('Password updated successfully');
      setStep(1);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setCode('');
      setChallenge(null);
    } catch (error) {
      toast.error(parseApiErrorMessage(error, 'Could not confirm password change'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      title="Security"
      description="Change your password and manage OTP relay for your team."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="border-b">
            <div className="flex items-center gap-2">
              <LockKeyhole className="size-4 text-primary" />
              <CardTitle className="text-sm">Change password</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Requires a one-time code. Org admins receive email; other roles use the inbox below.
            </p>
            <Stepper steps={STEPS} currentStep={step} className="pt-2" />
          </CardHeader>
          <CardContent className="pt-4">
            {step === 1 ? (
              <form className="space-y-4" onSubmit={(e) => void handleStartChange(e)}>
                <FormField label="Current password" required>
                  <FormInput
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </FormField>
                <FormField label="New password" required>
                  <FormInput
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </FormField>
                <FormField label="Confirm new password" required>
                  <FormInput
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </FormField>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Sending code…' : 'Continue'}
                </Button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={(e) => void handleConfirm(e)}>
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
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading || code.length < 6}>
                    {loading ? 'Saving…' : 'Confirm new password'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep(1);
                      setCode('');
                    }}
                  >
                    Back
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {isOrgAdmin ? (
          <OtpInboxPanel />
        ) : (
          <Card className="shadow-none">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-primary" />
                <CardTitle className="text-sm">OTP delivery</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              {user?.role === 'super_admin' ? (
                <p>Super admin OTPs are sent to your registered email address.</p>
              ) : (
                <p>
                  Your verification codes are relayed through your Organization Admin. Contact them
                  if you need a login, password reset, or device verification code.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}

import { z } from 'zod';

export const otpPurposeSchema = z.enum([
  'forgot_password',
  'change_password',
  'new_device',
  'tenant_invite',
]);

export type OtpPurpose = z.infer<typeof otpPurposeSchema>;

export const otpDeliverySchema = z.enum(['email', 'admin_inbox']);

export type OtpDelivery = z.infer<typeof otpDeliverySchema>;

export const otpChallengeResponseSchema = z.object({
  challengeId: z.string().uuid(),
  expiresAt: z.string(),
  resendAfter: z.string(),
  delivery: otpDeliverySchema,
  message: z.string(),
  devOtp: z.string().optional(),
});

export type OtpChallengeResponse = z.infer<typeof otpChallengeResponseSchema>;

export const otpInboxItemSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  userName: z.string().nullable(),
  purpose: otpPurposeSchema,
  delivery: otpDeliverySchema,
  relayCode: z.string().nullable(),
  expiresAt: z.string(),
  resendAfter: z.string(),
  attempts: z.number(),
  createdAt: z.string(),
});

export type OtpInboxItem = z.infer<typeof otpInboxItemSchema>;

export const OTP_PURPOSE_LABELS: Record<OtpPurpose, string> = {
  forgot_password: 'Forgot password',
  change_password: 'Change password',
  new_device: 'New device login',
  tenant_invite: 'Tenant invite',
};

export const forgotPasswordFoundResponseSchema = otpChallengeResponseSchema.extend({
  found: z.literal(true),
  message: z.string(),
});

export type ForgotPasswordFoundResponse = z.infer<typeof forgotPasswordFoundResponseSchema>;

export const forgotPasswordVerifyResponseSchema = z.object({
  resetToken: z.string().min(1),
  message: z.string(),
});

export type ForgotPasswordVerifyResponse = z.infer<typeof forgotPasswordVerifyResponseSchema>;

export const forgotPasswordResetRequestSchema = z.object({
  resetToken: z.string().min(1),
  newPassword: z.string().min(8),
});

export type ForgotPasswordResetRequest = z.infer<typeof forgotPasswordResetRequestSchema>;

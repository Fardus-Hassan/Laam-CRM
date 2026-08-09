import {
  forgotPasswordFoundResponseSchema,
  forgotPasswordVerifyResponseSchema,
  type ForgotPasswordFoundResponse,
  type ForgotPasswordVerifyResponse,
  type OtpChallengeResponse,
} from '@laam/types';

import { apiRequest } from '@/lib/api/client';
import { authEndpoints } from '@/lib/api/endpoints';

export type ChangePasswordStartResponse = OtpChallengeResponse & {
  requiresOtp: true;
};

export const passwordApi = {
  async forgotPassword(email: string): Promise<ForgotPasswordFoundResponse> {
    const data = await apiRequest<unknown>(authEndpoints.forgotPassword, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return forgotPasswordFoundResponseSchema.parse(data);
  },

  async resendForgotPassword(challengeId: string): Promise<OtpChallengeResponse & { message: string }> {
    const data = await apiRequest<unknown>(authEndpoints.forgotPasswordResend, {
      method: 'POST',
      body: JSON.stringify({ challengeId }),
    });
    return data as OtpChallengeResponse & { message: string };
  },

  async verifyForgotPasswordCode(email: string, code: string): Promise<ForgotPasswordVerifyResponse> {
    const data = await apiRequest<unknown>(authEndpoints.forgotPasswordVerifyCode, {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    return forgotPasswordVerifyResponseSchema.parse(data);
  },

  async resetPasswordWithToken(resetToken: string, newPassword: string) {
    return apiRequest<{ message: string }>(authEndpoints.forgotPasswordReset, {
      method: 'POST',
      body: JSON.stringify({ resetToken, newPassword }),
    });
  },

  async resendOtp(challengeId: string): Promise<OtpChallengeResponse & { message: string }> {
    const data = await apiRequest<unknown>(authEndpoints.otpResend, {
      method: 'POST',
      body: JSON.stringify({ challengeId }),
    });
    return data as OtpChallengeResponse & { message: string };
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordStartResponse> {
    const data = await apiRequest<unknown>(authEndpoints.changePassword, {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return data as ChangePasswordStartResponse;
  },

  async confirmChangePassword(code: string, newPassword: string) {
    return apiRequest<{ message: string }>(authEndpoints.changePasswordConfirm, {
      method: 'POST',
      body: JSON.stringify({ code, newPassword }),
    });
  },
};

import type { AuthSession, OtpChallengeResponse } from '@laam/types';

export type DeviceOtpChallenge = OtpChallengeResponse & {
  requiresDeviceOtp: true;
  email: string;
};

export type AuthLoginResult = AuthSession | DeviceOtpChallenge;

export function isDeviceOtpChallenge(result: AuthLoginResult): result is DeviceOtpChallenge {
  return 'requiresDeviceOtp' in result && result.requiresDeviceOtp === true;
}

export type AuthApi = {
  getSession: () => Promise<AuthSession | null>;
  login: (email: string, password: string) => Promise<AuthLoginResult>;
  loginVerifyDevice: (email: string, code: string) => Promise<AuthSession>;
  logout: () => Promise<void>;
};

export type AuthContextLogin = (email: string, password: string) => Promise<AuthLoginResult>;

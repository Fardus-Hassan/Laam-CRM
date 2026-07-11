import { authSessionSchema, type AuthSession, type UserRole } from '@laam/types';
import { apiRequest } from '@/lib/api/client';
import { authEndpoints } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { setStoredAccessToken } from '@/lib/auth-token';
import { getOrCreateDeviceId } from '@/lib/device-id';
import type { AuthApi, AuthLoginResult, DeviceOtpChallenge } from '@/features/auth/types';
import {
  createMockSession,
  createMockSessionForTenantOwner,
  type MockSessionContext,
} from '@/features/auth/mocks/mock-session';

type LoginApiResponse = {
  requiresDeviceOtp?: boolean;
  accessToken?: string;
  email?: string;
  user?: unknown;
  organization?: unknown;
  challengeId?: string;
  expiresAt?: string;
  resendAfter?: string;
  delivery?: 'email' | 'admin_inbox';
  message?: string;
  devOtp?: string;
};

function parseLoginResponse(data: LoginApiResponse): AuthLoginResult {
  const needsDeviceOtp =
    data.requiresDeviceOtp === true ||
    (Boolean(data.challengeId && data.email) && !data.user && !data.organization);

  if (needsDeviceOtp) {
    setStoredAccessToken(null);
    if (data.challengeId && data.email && data.expiresAt && data.resendAfter && data.delivery) {
      const challenge: DeviceOtpChallenge = {
        requiresDeviceOtp: true,
        email: data.email,
        challengeId: data.challengeId,
        expiresAt: data.expiresAt,
        resendAfter: data.resendAfter,
        delivery: data.delivery,
        message: data.message ?? 'Verification required',
        devOtp: data.devOtp,
      };
      return challenge;
    }
    throw new Error('Device verification required — check API is up to date');
  }

  if (data.accessToken) {
    setStoredAccessToken(data.accessToken);
  }

  return authSessionSchema.parse({ user: data.user, organization: data.organization });
}

function mapLoginError(error: unknown): never {
  if (error instanceof ApiError && error.status === 401) {
    throw new Error('Invalid email or password');
  }
  if (error instanceof ApiError && error.status === 403) {
    throw new Error('This account cannot sign in on this domain. Check super admin vs tenant URL.');
  }
  if (error instanceof ApiError && error.status >= 500) {
    throw new Error('Server error — is the API running on port 3333?');
  }
  if (error instanceof TypeError) {
    throw new Error('Cannot reach API at localhost:3333 — run pnpm dev:api');
  }
  throw error;
}

export function createHttpAuthApi(): AuthApi {
  return {
    async getSession() {
      try {
        const data = await apiRequest<unknown>(authEndpoints.session);
        return authSessionSchema.parse(data);
      } catch {
        return null;
      }
    },
    async login(email, password) {
      try {
        setStoredAccessToken(null);
        const data = await apiRequest<LoginApiResponse>(authEndpoints.login, {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            deviceId: getOrCreateDeviceId(),
          }),
        });
        return parseLoginResponse(data);
      } catch (error) {
        mapLoginError(error);
      }
    },
    async loginVerifyDevice(email, code) {
      try {
        const data = await apiRequest<LoginApiResponse>(authEndpoints.loginVerifyDevice, {
          method: 'POST',
          body: JSON.stringify({
            email,
            code,
            deviceId: getOrCreateDeviceId(),
          }),
        });
        return parseLoginResponse(data) as AuthSession;
      } catch (error) {
        if (error instanceof ApiError && error.status === 400) {
          throw new Error('Invalid or expired code');
        }
        mapLoginError(error);
      }
    },
    async logout() {
      try {
        await apiRequest<void>(authEndpoints.logout, { method: 'POST' });
      } finally {
        setStoredAccessToken(null);
      }
    },
  };
}

export function createMockAuthApi(initialRole: UserRole = 'org_admin'): AuthApi & {
  setRole: (role: UserRole) => void;
  setSessionContext: (context: MockSessionContext) => void;
  previewAsTenantOwner: (tenantId: string) => boolean;
} {
  let sessionContext: MockSessionContext = { role: initialRole };

  return {
    async getSession() {
      return createMockSession(sessionContext);
    },
    async login() {
      return createMockSession(sessionContext);
    },
    async loginVerifyDevice() {
      return createMockSession(sessionContext);
    },
    async logout() {
      sessionContext = { role: initialRole };
    },
    setRole(role: UserRole) {
      sessionContext = { role };
    },
    setSessionContext(context: MockSessionContext) {
      sessionContext = context;
    },
    previewAsTenantOwner(tenantId: string) {
      const session = createMockSessionForTenantOwner(tenantId);
      if (!session) {
        return false;
      }

      sessionContext = {
        role: session.user.role,
        organizationId: session.organization.id,
        userId: session.user.id,
        name: session.user.name,
        email: session.user.email,
        customRoleId: session.user.customRoleId,
        permissionGrants: session.user.permissionGrants,
        permissionDenies: session.user.permissionDenies,
      };

      return true;
    },
  };
}

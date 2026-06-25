import { authSessionSchema, type UserRole } from '@laam/types';
import { apiRequest } from '@/lib/api/client';
import { authEndpoints } from '@/lib/api/endpoints';
import type { AuthApi } from '@/features/auth/types';
import { createMockSession } from '@/features/auth/mocks/mock-session';

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
      const data = await apiRequest<unknown>(authEndpoints.login, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return authSessionSchema.parse(data);
    },
    async logout() {
      await apiRequest<void>(authEndpoints.logout, { method: 'POST' });
    },
  };
}

export function createMockAuthApi(initialRole: UserRole = 'org_admin'): AuthApi & {
  setRole: (role: UserRole) => void;
} {
  let currentRole = initialRole;

  return {
    async getSession() {
      return createMockSession(currentRole);
    },
    async login() {
      return createMockSession(currentRole);
    },
    async logout() {
      currentRole = initialRole;
    },
    setRole(role: UserRole) {
      currentRole = role;
    },
  };
}

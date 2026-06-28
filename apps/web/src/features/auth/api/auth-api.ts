import { authSessionSchema, type UserRole } from '@laam/types';
import { apiRequest } from '@/lib/api/client';
import { authEndpoints } from '@/lib/api/endpoints';
import type { AuthApi } from '@/features/auth/types';
import {
  createMockSession,
  createMockSessionForTenantOwner,
  type MockSessionContext,
} from '@/features/auth/mocks/mock-session';

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

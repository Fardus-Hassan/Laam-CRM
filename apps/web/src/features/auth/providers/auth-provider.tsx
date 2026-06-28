'use client';

import * as React from 'react';
import type { AuthSession, Permission, UserRole } from '@laam/types';
import {
  resolveUserPermissions,
} from '@laam/types';
import { env } from '@/config/env';
import {
  createHttpAuthApi,
  createMockAuthApi,
} from '@/features/auth/api/auth-api';
import {
  getDemoCustomRoleIdForUserRole,
  getRolePermissions,
} from '@/features/platform/data/mock-tenant-store';

function resolveSessionPermissions(user: AuthSession['user']): Permission[] {
  const customRolePermissions = user.customRoleId
    ? getRolePermissions(user.organizationId, user.customRoleId)
    : getRolePermissions(
        user.organizationId,
        getDemoCustomRoleIdForUserRole(user.organizationId, user.role),
      );

  return resolveUserPermissions({
    role: user.role,
    customRolePermissions,
    permissionGrants: user.permissionGrants,
    permissionDenies: user.permissionDenies,
    permissions: user.permissions,
  });
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  session: AuthSession | null;
  user: AuthSession['user'] | null;
  organization: AuthSession['organization'] | null;
  permissions: Permission[];
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  /** Dev/demo only — swap mock role without backend. */
  switchRole: (role: UserRole) => Promise<void>;
  /** Dev/demo only — preview as a tenant org admin after onboarding. */
  previewAsTenantOwner: (tenantId: string) => Promise<boolean>;
  canSwitchRole: boolean;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

const mockAuthApi = createMockAuthApi('sales_manager');
const httpAuthApi = createHttpAuthApi();
const authApi =
  env.isDev || env.enableRoleSwitch ? mockAuthApi : httpAuthApi;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>('loading');
  const [session, setSession] = React.useState<AuthSession | null>(null);

  const refreshSession = React.useCallback(async () => {
    setStatus('loading');
    const nextSession = await authApi.getSession();
    setSession(nextSession);
    setStatus(nextSession ? 'authenticated' : 'unauthenticated');
  }, []);

  React.useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const logout = React.useCallback(async () => {
    await authApi.logout();
    if (env.isDev) {
      await refreshSession();
      return;
    }
    setSession(null);
    setStatus('unauthenticated');
  }, [refreshSession]);

  const switchRole = React.useCallback(
    async (role: UserRole) => {
      if (!('setRole' in authApi) || typeof authApi.setRole !== 'function') {
        return;
      }

      authApi.setRole(role);
      await refreshSession();
    },
    [refreshSession],
  );

  const previewAsTenantOwner = React.useCallback(
    async (tenantId: string) => {
      if (
        !('previewAsTenantOwner' in authApi) ||
        typeof authApi.previewAsTenantOwner !== 'function'
      ) {
        return false;
      }

      const ok = authApi.previewAsTenantOwner(tenantId);
      if (ok) {
        await refreshSession();
      }

      return ok;
    },
    [refreshSession],
  );

  const permissions = React.useMemo(
    () => (session ? resolveSessionPermissions(session.user) : []),
    [session],
  );

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      organization: session?.organization ?? null,
      permissions,
      refreshSession,
      logout,
      switchRole,
      previewAsTenantOwner,
      canSwitchRole: env.isDev || env.enableRoleSwitch,
    }),
    [status, session, permissions, refreshSession, logout, switchRole, previewAsTenantOwner],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider.');
  }
  return context;
}

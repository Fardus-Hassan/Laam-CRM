'use client';

import * as React from 'react';
import type { AuthSession, Permission, UserRole } from '@laam/types';
import { resolveUserPermissions, TENANT_PERMISSIONS } from '@laam/types';
import { env } from '@/config/env';
import {
  createHttpAuthApi,
  createMockAuthApi,
} from '@/features/auth/api/auth-api';
import type { AuthLoginResult } from '@/features/auth/types';
import {
  getDemoCustomRoleIdForUserRole,
  getRolePermissions,
} from '@/features/platform/data/mock-tenant-store';
import { getStoredAccessToken, setStoredAccessToken } from '@/lib/auth-token';
import { setAccessTokenGetter } from '@/lib/api/client';

function resolveSessionPermissions(user: AuthSession['user']): Permission[] {
  if (env.useApi) {
    // Temporary: all tenant users get full module access until role-wise permissions ship.
    // Super admin keeps platform + tenant permissions via resolveUserPermissions.
    if (user.role === 'super_admin') {
      return resolveUserPermissions({
        role: user.role,
        permissionGrants: user.permissionGrants,
        permissionDenies: user.permissionDenies,
      });
    }
    return [...TENANT_PERMISSIONS];
  }

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
  login: (email: string, password: string) => Promise<AuthLoginResult>;
  loginVerifyDevice: (email: string, code: string) => Promise<AuthSession>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  previewAsTenantOwner: (tenantId: string) => Promise<boolean>;
  canSwitchRole: boolean;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

const mockAuthApi = createMockAuthApi('org_admin');
const httpAuthApi = createHttpAuthApi();

function pickAuthApi() {
  if (env.useApi) {
    return httpAuthApi;
  }
  if (env.isDev || env.enableRoleSwitch) {
    return mockAuthApi;
  }
  return httpAuthApi;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>('loading');
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const authApi = React.useMemo(() => pickAuthApi(), []);

  const refreshSession = React.useCallback(async () => {
    setStatus('loading');
    const nextSession = await authApi.getSession();
    setSession(nextSession);
    setStatus(nextSession ? 'authenticated' : 'unauthenticated');
  }, [authApi]);

  const login = React.useCallback(
    async (email: string, password: string) => {
      return authApi.login(email, password);
    },
    [authApi],
  );

  const loginVerifyDevice = React.useCallback(
    async (email: string, code: string) => {
      const nextSession = await authApi.loginVerifyDevice(email, code);
      setSession(nextSession);
      setStatus('authenticated');
      return nextSession;
    },
    [authApi],
  );

  React.useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  React.useEffect(() => {
    setAccessTokenGetter(() => getStoredAccessToken());
  }, [session]);

  const logout = React.useCallback(async () => {
    await authApi.logout();
    setStoredAccessToken(null);
    setSession(null);
    setStatus('unauthenticated');
    if (env.useApi && typeof window !== 'undefined') {
      window.location.assign('/login');
    }
  }, [authApi]);

  const switchRole = React.useCallback(
    async (role: UserRole) => {
      if (!('setRole' in authApi) || typeof authApi.setRole !== 'function') {
        return;
      }

      authApi.setRole(role);
      await refreshSession();
    },
    [authApi, refreshSession],
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
    [authApi, refreshSession],
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
      login,
      loginVerifyDevice,
      refreshSession,
      logout,
      switchRole,
      previewAsTenantOwner,
      canSwitchRole: !env.useApi && (env.isDev || env.enableRoleSwitch),
    }),
    [status, session, permissions, login, loginVerifyDevice, refreshSession, logout, switchRole, previewAsTenantOwner],
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

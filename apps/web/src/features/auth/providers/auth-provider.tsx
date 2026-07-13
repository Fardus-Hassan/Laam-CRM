'use client';

import * as React from 'react';
import type { AuthSession, Permission, UserRole } from '@laam/types';
import {
  isPlatformOnlyPermission,
  isValidPermission,
  resolveUserPermissions,
} from '@laam/types';
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
import {
  getStoredAccessToken,
  setStoredAccessToken,
  syncSessionCookieFromStorage,
} from '@/lib/auth-token';
import { setAccessTokenGetter } from '@/lib/api/client';

setAccessTokenGetter(() => getStoredAccessToken());

function stripNonSuperAdminPlatformAccess(
  role: UserRole,
  permissions: Permission[],
): Permission[] {
  if (role === 'super_admin') {
    return permissions;
  }
  return permissions.filter((permission) => !isPlatformOnlyPermission(permission));
}

function resolveSessionPermissions(user: AuthSession['user']): Permission[] {
  // API sessions include server-resolved effective permissions.
  if (env.useApi) {
    if (user.permissions?.length) {
      return stripNonSuperAdminPlatformAccess(
        user.role,
        user.permissions.filter(isValidPermission),
      );
    }
    return resolveUserPermissions({
      role: user.role,
      permissionGrants: user.permissionGrants,
      permissionDenies: user.permissionDenies,
    });
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
  refreshSession: (options?: { silent?: boolean }) => Promise<void>;
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
  const bootstrapped = React.useRef(false);

  const refreshSession = React.useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true && bootstrapped.current;
      if (!silent) {
        setStatus('loading');
      }

      syncSessionCookieFromStorage();
      const nextSession = await authApi.getSession();
      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'unauthenticated');
      bootstrapped.current = true;

      if (nextSession) {
        syncSessionCookieFromStorage();
      } else if (!getStoredAccessToken()) {
        syncSessionCookieFromStorage();
      } else {
        // Token present but session invalid — clear stale credentials.
        setStoredAccessToken(null);
      }
    },
    [authApi],
  );

  const login = React.useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password);
      if ('user' in result && result.user) {
        setSession(result);
        setStatus('authenticated');
        bootstrapped.current = true;
        syncSessionCookieFromStorage();
      }
      return result;
    },
    [authApi],
  );

  const loginVerifyDevice = React.useCallback(
    async (email: string, code: string) => {
      const nextSession = await authApi.loginVerifyDevice(email, code);
      setSession(nextSession);
      setStatus('authenticated');
      bootstrapped.current = true;
      syncSessionCookieFromStorage();
      return nextSession;
    },
    [authApi],
  );

  React.useEffect(() => {
    syncSessionCookieFromStorage();
    void refreshSession();
  }, [refreshSession]);

  const logout = React.useCallback(async () => {
    await authApi.logout();
    setStoredAccessToken(null);
    setSession(null);
    setStatus('unauthenticated');
    bootstrapped.current = true;
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
      await refreshSession({ silent: true });
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
        await refreshSession({ silent: true });
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
    [
      status,
      session,
      permissions,
      login,
      loginVerifyDevice,
      refreshSession,
      logout,
      switchRole,
      previewAsTenantOwner,
    ],
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

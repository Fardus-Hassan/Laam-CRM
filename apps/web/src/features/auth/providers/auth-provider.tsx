'use client';

import * as React from 'react';
import type { AuthSession, Permission, UserRole } from '@laam/types';
import { resolveUserPermissions } from '@laam/types';
import { env } from '@/config/env';
import {
  createHttpAuthApi,
  createMockAuthApi,
} from '@/features/auth/api/auth-api';

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
  canSwitchRole: boolean;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

const mockAuthApi = createMockAuthApi('org_admin');
const httpAuthApi = createHttpAuthApi();
const authApi = env.isDev ? mockAuthApi : httpAuthApi;

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
    setSession(null);
    setStatus('unauthenticated');
  }, []);

  const switchRole = React.useCallback(
    async (role: UserRole) => {
      if (!('setRole' in mockAuthApi)) {
        return;
      }

      mockAuthApi.setRole(role);
      await refreshSession();
    },
    [refreshSession],
  );

  const permissions = React.useMemo(
    () => (session ? resolveUserPermissions(session.user) : []),
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
      canSwitchRole: env.isDev || env.enableRoleSwitch,
    }),
    [status, session, permissions, refreshSession, logout, switchRole],
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

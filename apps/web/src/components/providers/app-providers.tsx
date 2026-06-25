'use client';

import { AuthProvider } from '@/features/auth/providers/auth-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

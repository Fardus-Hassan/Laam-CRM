import type { AuthSession, UserRole } from '@laam/types';

export type AuthApi = {
  getSession: () => Promise<AuthSession | null>;
  login: (email: string, password: string) => Promise<AuthSession>;
  logout: () => Promise<void>;
};

export type AuthApiOptions = {
  /** Dev-only helper until real auth ships. */
  setMockRole?: (role: UserRole) => void;
};

import type { AuthSession, UserRole } from '@laam/types';

export const MOCK_ORGANIZATION = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Laam',
  plan: 'Enterprise',
  slug: 'laam',
} as const;

export const MOCK_USER_BASE = {
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Laam User',
  email: 'user@laam.com',
  organizationId: MOCK_ORGANIZATION.id,
} as const;

export function createMockSession(role: UserRole): AuthSession {
  return {
    user: {
      ...MOCK_USER_BASE,
      role,
    },
    organization: MOCK_ORGANIZATION,
  };
}

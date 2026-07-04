import type { AuthSession, UserRole } from '@laam/types';
import { ROLE_DASHBOARD_TEMPLATE } from '@laam/types';

import {
  getDemoCustomRoleIdForUserRole,
  getOrganization,
  getTenantOwner,
} from '@/features/platform/data/mock-tenant-store';
import {
  MOCK_ORGANIZATION,
  MOCK_USER_BASE,
} from '@/features/auth/mocks/mock-organization';

export { MOCK_ORGANIZATION, MOCK_USER_BASE } from '@/features/auth/mocks/mock-organization';

export type MockSessionContext = {
  role: UserRole;
  organizationId?: string;
  userId?: string;
  name?: string;
  email?: string;
  customRoleId?: string;
  permissionGrants?: AuthSession['user']['permissionGrants'];
  permissionDenies?: AuthSession['user']['permissionDenies'];
};

export function createMockSession(
  context: MockSessionContext | UserRole = 'org_admin',
): AuthSession {
  const normalized: MockSessionContext =
    typeof context === 'string' ? { role: context } : context;

  const organizationId = normalized.organizationId ?? MOCK_ORGANIZATION.id;
  const organization = getOrganization(organizationId) ?? { ...MOCK_ORGANIZATION };

  return {
    user: {
      id: normalized.userId ?? MOCK_USER_BASE.id,
      name: normalized.name ?? MOCK_USER_BASE.name,
      email: normalized.email ?? MOCK_USER_BASE.email,
      organizationId,
      role: normalized.role,
      customRoleId:
        normalized.customRoleId ??
        getDemoCustomRoleIdForUserRole(organizationId, normalized.role),
      dashboardTemplate: ROLE_DASHBOARD_TEMPLATE[normalized.role],
      permissionGrants: normalized.permissionGrants ?? [],
      permissionDenies: normalized.permissionDenies ?? [],
    },
    organization,
  };
}

export function createMockSessionForTenantOwner(tenantId: string): AuthSession | null {
  const owner = getTenantOwner(tenantId);
  const organization = getOrganization(tenantId);

  if (!owner || !organization) {
    return null;
  }

  return createMockSession({
    role: 'org_admin',
    organizationId: tenantId,
    userId: owner.id,
    name: owner.name,
    email: owner.email,
    customRoleId: owner.customRoleId,
    permissionGrants: owner.permissionGrants,
    permissionDenies: owner.permissionDenies,
  });
}

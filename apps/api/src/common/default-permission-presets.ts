import type { PrismaClient } from '@prisma/client';
import type { DashboardTemplate, UserRole } from '@laam/types';

import { getPermissionsForRole } from './effective-permissions';

const ROLE_DASHBOARD_TEMPLATE: Record<
  Exclude<UserRole, 'super_admin'>,
  DashboardTemplate
> = {
  org_admin: 'executive',
  ceo: 'executive',
  team_leader: 'team_leader',
  sales_manager: 'sales_head',
  sales_rep: 'agent',
  marketing_head: 'marketing',
  support_agent: 'support',
  finance: 'finance',
  viewer: 'default',
};

type DefaultPresetDef = {
  name: string;
  description: string;
  role: Exclude<UserRole, 'super_admin'>;
};

const DEFAULT_PRESET_DEFS: DefaultPresetDef[] = [
  {
    name: 'Sales Agent',
    description: 'Call center agent — leads, orders, follow-ups',
    role: 'sales_rep',
  },
  {
    name: 'Team Leader',
    description: 'Manages team leads and orders',
    role: 'team_leader',
  },
  {
    name: 'Sales Head',
    description: 'Sales office manager',
    role: 'sales_manager',
  },
  {
    name: 'Marketing Head',
    description: 'Facebook ads and lead generation',
    role: 'marketing_head',
  },
  {
    name: 'CEO / Executive',
    description: 'Executive overview',
    role: 'ceo',
  },
  {
    name: 'Org Admin',
    description: 'Full organization access',
    role: 'org_admin',
  },
];

export function getDefaultPermissionPresetRows(organizationId: string) {
  return DEFAULT_PRESET_DEFS.map((def) => ({
    organizationId,
    name: def.name,
    description: def.description,
    permissions: [...getPermissionsForRole(def.role)],
    dashboardTemplate: ROLE_DASHBOARD_TEMPLATE[def.role],
  }));
}

/** Idempotent: seeds built-in presets when the org has none yet. */
export async function seedDefaultPermissionPresets(
  prisma: PrismaClient,
  organizationId: string,
): Promise<number> {
  const existing = await prisma.permissionPreset.count({ where: { organizationId } });
  if (existing > 0) {
    await syncBuiltInPresetPermissions(prisma, organizationId);
    return 0;
  }

  const rows = getDefaultPermissionPresetRows(organizationId);
  const result = await prisma.permissionPreset.createMany({ data: rows });
  return result.count;
}

/** Adds newly catalogued permissions (e.g. brand.*) onto known built-in presets. */
export async function syncBuiltInPresetPermissions(
  prisma: PrismaClient,
  organizationId: string,
): Promise<number> {
  let updated = 0;
  for (const def of DEFAULT_PRESET_DEFS) {
    const nextPermissions = [...getPermissionsForRole(def.role)];
    const rows = await prisma.permissionPreset.findMany({
      where: { organizationId, name: def.name },
    });
    for (const row of rows) {
      const current = new Set(row.permissions);
      const missing = nextPermissions.filter((p) => !current.has(p));
      if (!missing.length) {
        continue;
      }
      await prisma.permissionPreset.update({
        where: { id: row.id },
        data: { permissions: [...current, ...missing] },
      });
      updated += 1;
    }
  }
  return updated;
}

export function dashboardTemplateForSystemRole(role: UserRole): DashboardTemplate | undefined {
  if (role === 'super_admin') {
    return 'platform';
  }
  return ROLE_DASHBOARD_TEMPLATE[role];
}

import { z } from 'zod';
import { permissionSchema } from './permission-catalog.js';
import { userRoleSchema } from './roles.js';

export const tenantPlanSchema = z.enum(['Starter', 'Pro', 'Enterprise']);

export type TenantPlan = z.infer<typeof tenantPlanSchema>;

export const tenantStatusSchema = z.enum(['active', 'suspended', 'onboarding']);

export type TenantStatus = z.infer<typeof tenantStatusSchema>;

export const createTenantOwnerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
});

export type CreateTenantOwner = z.infer<typeof createTenantOwnerSchema>;

export const createTenantAdminSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export type CreateTenantAdmin = z.infer<typeof createTenantAdminSchema>;

export const createTenantRequestSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  plan: tenantPlanSchema,
  owner: createTenantOwnerSchema,
  additionalAdmins: z.array(createTenantAdminSchema).default([]),
});

export type CreateTenantRequest = z.infer<typeof createTenantRequestSchema>;

export const tenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  plan: tenantPlanSchema,
  status: tenantStatusSchema,
  phone: z.string().optional().nullable(),
  ownerUserId: z.string().uuid(),
  createdAt: z.string(),
});

export type Tenant = z.infer<typeof tenantSchema>;

export const tenantUserStatusSchema = z.enum(['active', 'invited', 'suspended']);
export type TenantUserStatus = z.infer<typeof tenantUserStatusSchema>;

export const tenantUserSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  systemRole: userRoleSchema,
  customRoleId: z.string().min(1).optional(),
  permissionGrants: z.array(permissionSchema).default([]),
  permissionDenies: z.array(permissionSchema).default([]),
  status: tenantUserStatusSchema.default('active'),
  lastSeenAt: z.string().optional(),
  orderDistributionPercent: z.number().min(0).max(100).optional(),
  /** Call-center / sales team this user belongs to (agents under a leader). */
  teamId: z.string().optional(),
  invitedByUserId: z.string().uuid().optional(),
  invitedBy: z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1),
      email: z.string().email().optional(),
    })
    .nullable()
    .optional(),
});

export type TenantUser = z.infer<typeof tenantUserSchema>;

export const tenantListItemSchema = tenantSchema.extend({
  owner: tenantUserSchema.nullable().optional(),
  ownerTempPassword: z.string().nullable().optional(),
  admins: z.array(tenantUserSchema).optional(),
});

export type TenantListItem = z.infer<typeof tenantListItemSchema>;

/** Sales / call-center team: one leader, many agents. */
export const orgTeamSchema = z.object({
  id: z.string(),
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  leaderUserId: z.string().uuid(),
  memberUserIds: z.array(z.string().uuid()).default([]),
  createdAt: z.string(),
});

export type OrgTeam = z.infer<typeof orgTeamSchema>;

export const createOrgTeamRequestSchema = z.object({
  name: z.string().min(1),
  leaderUserId: z.string().uuid(),
  memberUserIds: z.array(z.string().uuid()).default([]),
});

export type CreateOrgTeamRequest = z.infer<typeof createOrgTeamRequestSchema>;

export const updateOrgTeamRequestSchema = z.object({
  name: z.string().min(1).optional(),
  leaderUserId: z.string().uuid().optional(),
  memberUserIds: z.array(z.string().uuid()).optional(),
});

export type UpdateOrgTeamRequest = z.infer<typeof updateOrgTeamRequestSchema>;

export const createTenantUserRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  systemRole: userRoleSchema.default('sales_rep'),
  customRoleId: z.string().min(1).optional(),
  permissionGrants: z.array(permissionSchema).default([]),
  permissionDenies: z.array(permissionSchema).default([]),
});

export type CreateTenantUserRequest = z.infer<typeof createTenantUserRequestSchema>;

export const updateTenantUserAclSchema = z.object({
  customRoleId: z.string().min(1).optional(),
  systemRole: userRoleSchema.optional(),
  teamId: z.string().uuid().nullable().optional(),
  permissionGrants: z.array(permissionSchema).optional(),
  permissionDenies: z.array(permissionSchema).optional(),
});

export type UpdateTenantUserAcl = z.infer<typeof updateTenantUserAclSchema>;

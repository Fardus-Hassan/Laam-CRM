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

export const createTenantRequestSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  plan: tenantPlanSchema,
  owner: createTenantOwnerSchema,
});

export type CreateTenantRequest = z.infer<typeof createTenantRequestSchema>;

export const tenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  plan: tenantPlanSchema,
  status: tenantStatusSchema,
  ownerUserId: z.string().uuid(),
  createdAt: z.string(),
});

export type Tenant = z.infer<typeof tenantSchema>;

export const tenantUserSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  systemRole: userRoleSchema,
  customRoleId: z.string().min(1).optional(),
  permissionGrants: z.array(permissionSchema).default([]),
  permissionDenies: z.array(permissionSchema).default([]),
});

export type TenantUser = z.infer<typeof tenantUserSchema>;

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
  permissionGrants: z.array(permissionSchema).optional(),
  permissionDenies: z.array(permissionSchema).optional(),
});

export type UpdateTenantUserAcl = z.infer<typeof updateTenantUserAclSchema>;

import { z } from 'zod';
import { permissionSchema } from './permission-catalog.js';
import { dashboardTemplateSchema } from './dashboard-template.js';

export const customRoleSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(permissionSchema),
  dashboardTemplate: dashboardTemplateSchema.optional(),
  isSystem: z.boolean().default(false),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type CustomRole = z.infer<typeof customRoleSchema>;

export const permissionPresetSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(permissionSchema),
  dashboardTemplate: dashboardTemplateSchema.optional(),
});

export type PermissionPreset = z.infer<typeof permissionPresetSchema>;

export const userAclSchema = z.object({
  customRoleId: z.string().min(1).optional(),
  permissionGrants: z.array(permissionSchema).default([]),
  permissionDenies: z.array(permissionSchema).default([]),
});

export type UserAcl = z.infer<typeof userAclSchema>;

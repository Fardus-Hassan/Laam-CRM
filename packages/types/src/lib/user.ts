import { z } from 'zod';
import { permissionSchema } from './permission-catalog.js';
import { dashboardTemplateSchema } from './dashboard-template.js';
import { userRoleSchema } from './roles.js';

export const organizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  plan: z.string().min(1),
  slug: z.string().min(1),
});

export type Organization = z.infer<typeof organizationSchema>;

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: userRoleSchema,
  organizationId: z.string().uuid(),
  avatarUrl: z.string().url().optional(),
  customRoleId: z.string().min(1).optional(),
  dashboardTemplate: dashboardTemplateSchema.optional(),
  permissionGrants: z.array(permissionSchema).optional(),
  permissionDenies: z.array(permissionSchema).optional(),
  /** @deprecated Use permissionGrants */
  permissions: z.array(z.string()).optional(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

export const authSessionSchema = z.object({
  user: sessionUserSchema,
  organization: organizationSchema,
});

export type AuthSession = z.infer<typeof authSessionSchema>;

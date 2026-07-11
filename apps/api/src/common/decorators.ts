import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';

import { resolveTenantSlugFromRequest } from './tenant.util';

export type AuthUserPayload = {
  userId: string;
  email: string;
  systemRole: string;
  organizationId: string | null;
};

export type RequestWithAuth = Request & {
  user?: AuthUserPayload;
  tenantSlug?: string | null;
};

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUserPayload => {
    const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
    if (!request.user) {
      throw new Error('Missing authenticated user on request');
    }
    return request.user;
  },
);

export const TenantSlug = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
    return request.tenantSlug ?? resolveTenantSlugFromRequest(request);
  },
);

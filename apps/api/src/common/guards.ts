import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { hasPermission } from './effective-permissions';
import type { Permission } from '@laam/types';

import { IS_PUBLIC_KEY, PERMISSIONS_KEY, ROLES_KEY } from './decorators';
import { PermissionResolverService } from './permission-resolver.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  override handleRequest<TUser>(err: Error | null, user: TUser | false): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Invalid or expired session');
    }
    return user;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: { systemRole: string } }>();
    const user = request.user;
    if (!user || !roles.includes(user.systemRole)) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionResolver: PermissionResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { userId: string };
    }>();
    const user = request.user;
    if (!user?.userId) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const effective = await this.permissionResolver.resolveForUserId(user.userId);
    if (!hasPermission(effective, required, 'any')) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

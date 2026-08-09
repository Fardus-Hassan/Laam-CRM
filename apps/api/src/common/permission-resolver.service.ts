import { Injectable } from '@nestjs/common';
import type { Permission, UserRole } from '@laam/types';

import {
  isValidPermission,
  resolveUserPermissions,
  hasPermission,
} from './effective-permissions';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForUserId(userId: string): Promise<Permission[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customRole: true },
    });
    if (!user) {
      return [];
    }
    return this.resolveFromUserRow(user);
  }

  async resolveFromUserRow(user: {
    systemRole: string;
    permissionGrants: string[];
    permissionDenies: string[];
    customRoleId: string | null;
    customRole?: { permissions: string[] } | null;
  }): Promise<Permission[]> {
    let customRolePermissions: Permission[] | undefined;

    if (user.customRole?.permissions?.length) {
      customRolePermissions = user.customRole.permissions.filter(isValidPermission);
    } else if (user.customRoleId && !user.customRoleId.startsWith('system:')) {
      const role = await this.prisma.customRole.findUnique({
        where: { id: user.customRoleId },
      });
      if (role) {
        customRolePermissions = role.permissions.filter(isValidPermission);
      }
    }

    return resolveUserPermissions({
      role: user.systemRole as UserRole,
      customRolePermissions,
      permissionGrants: user.permissionGrants,
      permissionDenies: user.permissionDenies,
    });
  }

  async userHasPermission(
    userId: string,
    required: Permission | Permission[],
    match: 'any' | 'all' = 'any',
  ): Promise<boolean> {
    const permissions = await this.resolveForUserId(userId);
    return hasPermission(permissions, required, match);
  }
}

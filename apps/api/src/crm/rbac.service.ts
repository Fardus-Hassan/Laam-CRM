import { randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type {
  CreateOrgTeamRequest,
  CreateTenantUserRequest,
  CustomRole,
  OrgTeam,
  Permission,
  PermissionPreset,
  TenantUser,
  UpdateOrgTeamRequest,
  UpdateTenantUserAcl,
  UserRole,
} from '@laam/types';

import {
  getPermissionsForRole,
  isValidPermission,
} from '../common/effective-permissions';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { tenantWebUrl } from '../common/tenant.util';

type TenantRole = Exclude<UserRole, 'super_admin'>;

const TENANT_ROLES: TenantRole[] = [
  'org_admin',
  'ceo',
  'team_leader',
  'sales_manager',
  'sales_rep',
  'marketing_head',
  'support_agent',
  'finance',
  'viewer',
];

function isTenantRole(role: string): role is TenantRole {
  return (TENANT_ROLES as string[]).includes(role);
}

const ROLE_LABELS: Record<string, string> = {
  org_admin: 'Org Admin',
  ceo: 'CEO',
  team_leader: 'Team Leader',
  sales_manager: 'Sales Manager',
  sales_rep: 'Sales Rep',
  marketing_head: 'Marketing Head',
  support_agent: 'Support Agent',
  finance: 'Finance',
  viewer: 'Viewer',
};

function normalizePermissions(values: string[] | undefined): Permission[] {
  if (!values?.length) {
    return [];
  }
  // Platform / super-admin access is never stored on tenant users or roles.
  return values.filter(
    (value): value is Permission =>
      isValidPermission(value) &&
      !value.startsWith('platform.') &&
      value !== 'dashboard.widget.platform',
  );
}

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  assertOrgAccess(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }
  }

  async listUsers(organizationId: string): Promise<TenantUser[]> {
    const rows = await this.prisma.user.findMany({
      where: { organizationId },
      include: { invitedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.toTenantUser(row));
  }

  async createUser(
    organizationId: string,
    input: CreateTenantUserRequest,
    invitedByUserId?: string | null,
  ): Promise<TenantUser> {
    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, slug: { not: 'platform' } },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const systemRole = this.resolveSystemRole(input);
    const customRole = await this.resolveCustomRole(organizationId, input.customRoleId);
    const customRoleId = customRole?.id ?? null;

    let inviterId: string | null = null;
    if (invitedByUserId) {
      const inviter = await this.prisma.user.findFirst({
        where: { id: invitedByUserId, organizationId },
      });
      inviterId = inviter?.id ?? null;
    }

    const tempPassword = randomBytes(4).toString('hex') + 'A1!';
    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name.trim(),
        passwordHash: await bcrypt.hash(tempPassword, 12),
        inviteTempPassword: tempPassword,
        systemRole,
        status: 'invited',
        organizationId,
        customRoleId,
        invitedByUserId: inviterId,
        permissionGrants: normalizePermissions(input.permissionGrants),
        permissionDenies: normalizePermissions(input.permissionDenies),
      },
      include: { invitedBy: { select: { id: true, name: true } } },
    });

    const loginUrl = `${tenantWebUrl(org.slug)}/login`;
    const roleLabel = customRole?.name ?? ROLE_LABELS[systemRole] ?? systemRole;

    const emailResult = await this.email.sendTenantInviteEmail({
      to: email,
      ownerName: input.name.trim(),
      companyName: org.name,
      loginUrl,
      email,
      tempPassword,
      roleLabel,
    });

    this.logger.log(
      `Invited ${email} to ${org.slug} as ${roleLabel} (emailSent=${emailResult.sent})`,
    );

    return this.toTenantUser(user);
  }

  async updateUser(
    organizationId: string,
    userId: string,
    patch: UpdateTenantUserAcl & {
      customRoleId?: string;
      systemRole?: UserRole;
      teamId?: string | null;
      name?: string;
    },
  ): Promise<TenantUser> {
    const user = await this.requireOrgUser(organizationId, userId);

    if (patch.systemRole === 'super_admin') {
      throw new BadRequestException('Cannot set super admin role');
    }

    if (patch.teamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: patch.teamId, organizationId },
      });
      if (!team) {
        throw new BadRequestException('Team not found in this organization');
      }
    }

    let nextRole: TenantRole | undefined =
      patch.systemRole && isTenantRole(patch.systemRole) ? patch.systemRole : undefined;
    if (patch.customRoleId?.startsWith('system:')) {
      const role = patch.customRoleId.slice('system:'.length);
      if (isTenantRole(role)) {
        nextRole = role;
      }
    }

    const customRoleId =
      patch.customRoleId === undefined
        ? undefined
        : (await this.resolveCustomRole(organizationId, patch.customRoleId))?.id ?? null;

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: patch.name?.trim() ?? undefined,
        systemRole: nextRole ?? undefined,
        customRoleId,
        permissionGrants:
          patch.permissionGrants === undefined
            ? undefined
            : normalizePermissions(patch.permissionGrants),
        permissionDenies:
          patch.permissionDenies === undefined
            ? undefined
            : normalizePermissions(patch.permissionDenies),
        teamId: patch.teamId === undefined ? undefined : patch.teamId,
      },
      include: { invitedBy: { select: { id: true, name: true } } },
    });

    return this.toTenantUser(updated);
  }

  async updateUserStatus(
    organizationId: string,
    userId: string,
    status: 'active' | 'suspended',
  ): Promise<TenantUser> {
    const user = await this.requireOrgUser(organizationId, userId);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { status },
      include: { invitedBy: { select: { id: true, name: true } } },
    });
    return this.toTenantUser(updated);
  }

  async deleteUser(
    organizationId: string,
    userId: string,
    actorUserId: string,
  ): Promise<boolean> {
    if (userId === actorUserId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const user = await this.requireOrgUser(organizationId, userId);

    if (user.systemRole === 'org_admin') {
      const adminCount = await this.prisma.user.count({
        where: { organizationId, systemRole: 'org_admin', status: { not: 'suspended' } },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot delete the last organization admin');
      }
    }

    if (user.status !== 'invited') {
      throw new BadRequestException(
        'Only invited users who never activated can be permanently deleted. Suspend active users instead.',
      );
    }

    const ledTeams = await this.prisma.team.findMany({
      where: { organizationId, leaderUserId: userId },
    });
    if (ledTeams.length) {
      throw new BadRequestException('Reassign or delete teams this user leads before deleting them');
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return true;
  }

  async bulkUsers(
    organizationId: string,
    actorUserId: string,
    input: {
      userIds: string[];
      action: 'suspend' | 'activate' | 'delete' | 'set_role';
      customRoleId?: string;
    },
  ): Promise<{ processed: number }> {
    const uniqueIds = [...new Set(input.userIds.filter(Boolean))];
    if (!uniqueIds.length) {
      throw new BadRequestException('No users selected');
    }

    let processed = 0;

    if (input.action === 'set_role') {
      if (!input.customRoleId) {
        throw new BadRequestException('customRoleId is required for set_role');
      }
      for (const userId of uniqueIds) {
        await this.updateUser(organizationId, userId, {
          customRoleId: input.customRoleId,
          systemRole: input.customRoleId.startsWith('system:')
            ? (input.customRoleId.slice('system:'.length) as UserRole)
            : undefined,
        });
        processed += 1;
      }
      return { processed };
    }

    for (const userId of uniqueIds) {
      if (input.action === 'suspend') {
        await this.updateUserStatus(organizationId, userId, 'suspended');
        processed += 1;
      } else if (input.action === 'activate') {
        await this.updateUserStatus(organizationId, userId, 'active');
        processed += 1;
      } else if (input.action === 'delete') {
        await this.deleteUser(organizationId, userId, actorUserId);
        processed += 1;
      }
    }

    return { processed };
  }

  async listRoles(organizationId: string): Promise<CustomRole[]> {
    const systemRoles: CustomRole[] = TENANT_ROLES.map((role) => ({
      id: `system:${role}`,
      organizationId,
      name: ROLE_LABELS[role] ?? role,
      description: `System role — ${ROLE_LABELS[role] ?? role}`,
      permissions: [...getPermissionsForRole(role)],
      isSystem: true,
    }));

    const custom = await this.prisma.customRole.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });

    return [
      ...systemRoles,
      ...custom.map((row) => this.toCustomRole(row)),
    ];
  }

  async createRole(
    organizationId: string,
    input: {
      name: string;
      description?: string;
      permissions: string[];
    },
  ): Promise<CustomRole> {
    const name = input.name.trim();
    if (!name) {
      throw new BadRequestException('Role name is required');
    }

    const existing = await this.prisma.customRole.findFirst({
      where: { organizationId, name },
    });
    if (existing) {
      throw new BadRequestException('A role with this name already exists');
    }

    const row = await this.prisma.customRole.create({
      data: {
        organizationId,
        name,
        description: input.description?.trim() || null,
        permissions: normalizePermissions(input.permissions),
      },
    });

    return this.toCustomRole(row);
  }

  async updateRole(
    organizationId: string,
    roleId: string,
    patch: {
      name?: string;
      description?: string;
      permissions?: string[];
    },
  ): Promise<CustomRole> {
    if (roleId.startsWith('system:')) {
      throw new BadRequestException('System roles cannot be edited');
    }

    const role = await this.prisma.customRole.findFirst({
      where: { id: roleId, organizationId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (patch.name?.trim() && patch.name.trim() !== role.name) {
      const clash = await this.prisma.customRole.findFirst({
        where: { organizationId, name: patch.name.trim(), NOT: { id: roleId } },
      });
      if (clash) {
        throw new BadRequestException('A role with this name already exists');
      }
    }

    const updated = await this.prisma.customRole.update({
      where: { id: roleId },
      data: {
        name: patch.name?.trim() ?? undefined,
        description:
          patch.description === undefined ? undefined : patch.description.trim() || null,
        permissions:
          patch.permissions === undefined
            ? undefined
            : normalizePermissions(patch.permissions),
      },
    });

    return this.toCustomRole(updated);
  }

  async deleteRole(organizationId: string, roleId: string): Promise<boolean> {
    if (roleId.startsWith('system:')) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    const role = await this.prisma.customRole.findFirst({
      where: { id: roleId, organizationId },
    });
    if (!role) {
      return false;
    }

    const assigned = await this.prisma.user.count({
      where: { organizationId, customRoleId: roleId },
    });
    if (assigned > 0) {
      throw new BadRequestException(
        `Cannot delete role — ${assigned} user(s) still assigned. Reassign them first.`,
      );
    }

    await this.prisma.customRole.delete({ where: { id: roleId } });
    return true;
  }

  async listPresets(organizationId: string): Promise<PermissionPreset[]> {
    const rows = await this.prisma.permissionPreset.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => this.toPreset(row));
  }

  async createPreset(
    organizationId: string,
    input: { name: string; description?: string; permissions: string[] },
  ): Promise<PermissionPreset> {
    const name = input.name.trim();
    if (!name) {
      throw new BadRequestException('Preset name is required');
    }

    const existing = await this.prisma.permissionPreset.findFirst({
      where: { organizationId, name },
    });
    if (existing) {
      throw new BadRequestException('A preset with this name already exists');
    }

    const row = await this.prisma.permissionPreset.create({
      data: {
        organizationId,
        name,
        description: input.description?.trim() || null,
        permissions: normalizePermissions(input.permissions),
      },
    });

    return this.toPreset(row);
  }

  async updatePreset(
    organizationId: string,
    presetId: string,
    input: { name?: string; description?: string; permissions?: string[] },
  ): Promise<PermissionPreset> {
    const preset = await this.prisma.permissionPreset.findFirst({
      where: { id: presetId, organizationId },
    });
    if (!preset) {
      throw new NotFoundException('Preset not found');
    }

    if (input.name?.trim() && input.name.trim() !== preset.name) {
      const clash = await this.prisma.permissionPreset.findFirst({
        where: { organizationId, name: input.name.trim(), NOT: { id: presetId } },
      });
      if (clash) {
        throw new BadRequestException('A preset with this name already exists');
      }
    }

    const updated = await this.prisma.permissionPreset.update({
      where: { id: presetId },
      data: {
        name: input.name?.trim() ?? undefined,
        description:
          input.description === undefined ? undefined : input.description.trim() || null,
        permissions:
          input.permissions === undefined
            ? undefined
            : normalizePermissions(input.permissions),
      },
    });

    return this.toPreset(updated);
  }

  async deletePreset(organizationId: string, presetId: string): Promise<boolean> {
    const preset = await this.prisma.permissionPreset.findFirst({
      where: { id: presetId, organizationId },
    });
    if (!preset) {
      return false;
    }
    await this.prisma.permissionPreset.delete({ where: { id: presetId } });
    return true;
  }

  async listTeams(organizationId: string): Promise<OrgTeam[]> {
    const teams = await this.prisma.team.findMany({
      where: { organizationId },
      include: { members: { select: { id: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return teams.map((team) => ({
      id: team.id,
      organizationId: team.organizationId,
      name: team.name,
      leaderUserId: team.leaderUserId,
      memberUserIds: team.members.map((m) => m.id).filter((id) => id !== team.leaderUserId),
      createdAt: team.createdAt.toISOString(),
    }));
  }

  async createTeam(organizationId: string, input: CreateOrgTeamRequest): Promise<OrgTeam> {
    await this.assertUsersInOrg(organizationId, [input.leaderUserId, ...input.memberUserIds]);
    const memberIds = input.memberUserIds.filter((id) => id !== input.leaderUserId);

    const team = await this.prisma.team.create({
      data: {
        organizationId,
        name: input.name.trim(),
        leaderUserId: input.leaderUserId,
      },
    });

    await this.syncTeamMembers(organizationId, team.id, input.leaderUserId, memberIds);

    return {
      id: team.id,
      organizationId,
      name: team.name,
      leaderUserId: team.leaderUserId,
      memberUserIds: memberIds,
      createdAt: team.createdAt.toISOString(),
    };
  }

  async updateTeam(
    organizationId: string,
    teamId: string,
    patch: UpdateOrgTeamRequest,
  ): Promise<OrgTeam> {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, organizationId },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const leaderUserId = patch.leaderUserId ?? team.leaderUserId;
    let nextMembers: string[];
    if (patch.memberUserIds !== undefined) {
      nextMembers = patch.memberUserIds.filter((id) => id !== leaderUserId);
    } else {
      const current = await this.prisma.user.findMany({
        where: { organizationId, teamId, id: { not: leaderUserId } },
        select: { id: true },
      });
      nextMembers = current.map((u) => u.id);
    }

    await this.assertUsersInOrg(organizationId, [leaderUserId, ...nextMembers]);

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        name: patch.name?.trim() ?? undefined,
        leaderUserId,
      },
    });

    await this.syncTeamMembers(organizationId, teamId, leaderUserId, nextMembers);

    return {
      id: updated.id,
      organizationId,
      name: updated.name,
      leaderUserId: updated.leaderUserId,
      memberUserIds: nextMembers,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteTeam(organizationId: string, teamId: string): Promise<boolean> {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, organizationId },
    });
    if (!team) {
      return false;
    }

    await this.prisma.user.updateMany({
      where: { organizationId, teamId },
      data: { teamId: null },
    });
    await this.prisma.team.delete({ where: { id: teamId } });
    return true;
  }

  private resolveSystemRole(input: CreateTenantUserRequest): TenantRole {
    if (input.customRoleId?.startsWith('system:')) {
      const role = input.customRoleId.slice('system:'.length);
      if (isTenantRole(role)) {
        return role;
      }
    }
    if (input.systemRole && isTenantRole(input.systemRole)) {
      return input.systemRole;
    }
    return 'sales_rep';
  }

  /** System role ids are not FKs — only real CustomRole UUIDs are stored. */
  private async resolveCustomRole(
    organizationId: string,
    customRoleId: string | undefined | null,
  ): Promise<{ id: string; name: string } | null> {
    if (!customRoleId || customRoleId.startsWith('system:')) {
      return null;
    }

    const role = await this.prisma.customRole.findFirst({
      where: { id: customRoleId, organizationId },
    });
    if (!role) {
      throw new BadRequestException('Custom role not found in this organization');
    }
    return { id: role.id, name: role.name };
  }

  private async requireOrgUser(organizationId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async assertUsersInOrg(organizationId: string, userIds: string[]) {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (!unique.length) {
      return;
    }
    const count = await this.prisma.user.count({
      where: { organizationId, id: { in: unique } },
    });
    if (count !== unique.length) {
      throw new BadRequestException('One or more users do not belong to this organization');
    }
  }

  private async syncTeamMembers(
    organizationId: string,
    teamId: string,
    leaderUserId: string,
    memberIds: string[],
  ) {
    await this.prisma.user.updateMany({
      where: {
        organizationId,
        teamId,
        id: { notIn: [leaderUserId, ...memberIds] },
      },
      data: { teamId: null },
    });

    const leader = await this.prisma.user.findUnique({ where: { id: leaderUserId } });
    if (!leader) {
      throw new BadRequestException('Team leader not found');
    }

    await this.prisma.user.update({
      where: { id: leaderUserId },
      data: {
        teamId,
        systemRole:
          leader.systemRole === 'org_admin' || leader.systemRole === 'sales_manager'
            ? leader.systemRole
            : 'team_leader',
      },
    });

    for (const memberId of memberIds) {
      const member = await this.prisma.user.findUnique({ where: { id: memberId } });
      if (!member) {
        continue;
      }
      await this.prisma.user.update({
        where: { id: memberId },
        data: {
          teamId,
          systemRole:
            member.systemRole === 'team_leader' || member.systemRole === 'sales_rep'
              ? 'sales_rep'
              : member.systemRole,
        },
      });
    }
  }

  private toCustomRole(row: {
    id: string;
    organizationId: string;
    name: string;
    description: string | null;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
  }): CustomRole {
    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      description: row.description ?? undefined,
      permissions: normalizePermissions(row.permissions),
      isSystem: false,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toPreset(row: {
    id: string;
    organizationId: string;
    name: string;
    description: string | null;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
  }): PermissionPreset {
    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      description: row.description ?? undefined,
      permissions: normalizePermissions(row.permissions),
      isSystem: false,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toTenantUser(row: {
    id: string;
    email: string;
    name: string;
    systemRole: string;
    status: string;
    organizationId: string | null;
    customRoleId: string | null;
    permissionGrants: string[];
    permissionDenies: string[];
    teamId: string | null;
    lastSeenAt: Date | null;
    invitedByUserId?: string | null;
    invitedBy?: { id: string; name: string } | null;
  }): TenantUser {
    return {
      id: row.id,
      organizationId: row.organizationId!,
      name: row.name,
      email: row.email,
      systemRole: row.systemRole as TenantUser['systemRole'],
      customRoleId: row.customRoleId ?? undefined,
      permissionGrants: normalizePermissions(row.permissionGrants),
      permissionDenies: normalizePermissions(row.permissionDenies),
      status: row.status as TenantUser['status'],
      lastSeenAt: row.lastSeenAt?.toISOString(),
      teamId: row.teamId ?? undefined,
      invitedByUserId: row.invitedByUserId ?? undefined,
      invitedBy: row.invitedBy ?? null,
    };
  }
}

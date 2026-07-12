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
  TenantUser,
  UpdateOrgTeamRequest,
  UpdateTenantUserAcl,
  UserRole,
} from '@laam/types';

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
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.toTenantUser(row));
  }

  async createUser(organizationId: string, input: CreateTenantUserRequest): Promise<TenantUser> {
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
        customRoleId: input.customRoleId || null,
        permissionGrants: input.permissionGrants ?? [],
        permissionDenies: input.permissionDenies ?? [],
      },
    });

    const loginUrl = `${tenantWebUrl(org.slug)}/login`;
    const roleLabel = ROLE_LABELS[systemRole] ?? systemRole;

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
      `Invited ${email} to ${org.slug} as ${systemRole} (emailSent=${emailResult.sent})`,
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

    let nextRole: TenantRole | undefined = patch.systemRole;
    if (patch.customRoleId?.startsWith('system:')) {
      const role = patch.customRoleId.slice('system:'.length);
      if (isTenantRole(role)) {
        nextRole = role;
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: patch.name?.trim() ?? undefined,
        systemRole: nextRole ?? undefined,
        customRoleId: patch.customRoleId === undefined ? undefined : patch.customRoleId || null,
        permissionGrants: patch.permissionGrants ?? undefined,
        permissionDenies: patch.permissionDenies ?? undefined,
        teamId: patch.teamId === undefined ? undefined : patch.teamId,
      },
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
    });
    return this.toTenantUser(updated);
  }

  listRoles(organizationId: string): CustomRole[] {
    return TENANT_ROLES.map((role) => ({
      id: `system:${role}`,
      organizationId,
      name: ROLE_LABELS[role] ?? role,
      description: `System role — ${ROLE_LABELS[role] ?? role}`,
      permissions: [] as Permission[],
      isSystem: true,
    }));
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
  }): TenantUser {
    return {
      id: row.id,
      organizationId: row.organizationId!,
      name: row.name,
      email: row.email,
      systemRole: row.systemRole as TenantUser['systemRole'],
      customRoleId: row.customRoleId ?? undefined,
      permissionGrants: row.permissionGrants as TenantUser['permissionGrants'],
      permissionDenies: row.permissionDenies as TenantUser['permissionDenies'],
      status: row.status as TenantUser['status'],
      lastSeenAt: row.lastSeenAt?.toISOString(),
      teamId: row.teamId ?? undefined,
    };
  }
}

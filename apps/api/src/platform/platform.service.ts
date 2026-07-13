import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import type { CreateTenantRequest, Tenant, TenantListItem, TenantUser } from '@laam/types';

import type { AuthUserPayload } from '../common/decorators';
import { seedDefaultPermissionPresets } from '../common/default-permission-presets';
import { isEmailMockMode, tenantWebUrl } from '../common/tenant.util';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  assertSuperAdmin(user: AuthUserPayload) {
    if (user.systemRole !== 'super_admin') {
      throw new ForbiddenException('Super admin only');
    }
  }

  async listTenants(): Promise<TenantListItem[]> {
    const rows = await this.prisma.organization.findMany({
      where: { slug: { not: 'platform' } },
      include: {
        users: {
          where: { systemRole: 'org_admin' },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => {
      const admins = row.users.map((u) => this.toTenantUser(u));
      const ownerUser = row.users[0];
      const owner = ownerUser ? this.toTenantUser(ownerUser) : null;
      return {
        ...this.toTenant({
          ...row,
          ownerUserId: owner?.id,
        }),
        owner,
        admins,
        ownerTempPassword: ownerUser?.inviteTempPassword ?? null,
      };
    });
  }

  async getTenant(id: string): Promise<Tenant | null> {
    const row = await this.prisma.organization.findFirst({
      where: { id, slug: { not: 'platform' } },
      include: {
        users: {
          where: { systemRole: 'org_admin' },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!row) {
      return null;
    }

    return this.toTenant({
      ...row,
      ownerUserId: row.users[0]?.id,
    });
  }

  async getTenantOwner(tenantId: string): Promise<TenantUser | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        organizationId: tenantId,
        systemRole: 'org_admin',
      },
      orderBy: { createdAt: 'asc' },
    });

    return user ? this.toTenantUser(user) : null;
  }

  async createTenant(input: CreateTenantRequest) {
    const slug = input.slug.trim().toLowerCase();
    if (slug === 'platform') {
      throw new BadRequestException('Reserved slug');
    }

    const existing = await this.prisma.organization.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException('Slug already in use');
    }

    const ownerEmail = input.owner.email.trim().toLowerCase();
    const additionalAdmins = input.additionalAdmins ?? [];
    const allEmails = [
      ownerEmail,
      ...additionalAdmins.map((a) => a.email.trim().toLowerCase()),
    ];
    if (new Set(allEmails).size !== allEmails.length) {
      throw new BadRequestException('Duplicate admin emails in request');
    }

    for (const email of allEmails) {
      const taken = await this.prisma.user.findUnique({ where: { email } });
      if (taken) {
        throw new BadRequestException(`Email already registered: ${email}`);
      }
    }

    const organization = await this.prisma.organization.create({
      data: {
        name: input.name.trim(),
        slug,
        plan: input.plan,
        status: 'onboarding',
        phone: input.owner.phone?.trim() || null,
      },
    });

    await seedDefaultPermissionPresets(this.prisma, organization.id);

    const owner = await this.createOrgAdminUser({
      organizationId: organization.id,
      name: input.owner.name.trim(),
      email: ownerEmail,
      companyName: input.name.trim(),
      slug,
    });

    const extraAdmins = [];
    for (const admin of additionalAdmins) {
      const created = await this.createOrgAdminUser({
        organizationId: organization.id,
        name: admin.name.trim(),
        email: admin.email.trim().toLowerCase(),
        companyName: input.name.trim(),
        slug,
      });
      extraAdmins.push(created);
    }

    await this.prisma.organization.update({
      where: { id: organization.id },
      data: { status: 'active' },
    });

    return {
      tenant: this.toTenant({
        ...organization,
        status: 'active',
        phone: organization.phone,
        ownerUserId: owner.userId,
      }),
      provision: {
        loginUrl: owner.loginUrl,
        email: owner.email,
        tempPassword: owner.tempPassword,
        emailSent: owner.emailSent,
        emailWarning: owner.emailWarning,
        additionalAdmins: extraAdmins.map((a) => ({
          email: a.email,
          emailSent: a.emailSent,
          emailWarning: a.emailWarning,
        })),
      },
    };
  }

  async updateTenantStatus(id: string, status: 'active' | 'suspended' | 'onboarding') {
    const row = await this.prisma.organization.findFirst({
      where: { id, slug: { not: 'platform' } },
    });
    if (!row) {
      throw new NotFoundException('Tenant not found');
    }

    const updated = await this.prisma.organization.update({
      where: { id },
      data: { status },
    });

    return this.toTenant(updated);
  }

  async addTenantAdmin(tenantId: string, input: { name: string; email: string }) {
    const org = await this.prisma.organization.findFirst({
      where: { id: tenantId, slug: { not: 'platform' } },
    });
    if (!org) {
      throw new NotFoundException('Tenant not found');
    }

    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const created = await this.createOrgAdminUser({
      organizationId: org.id,
      name: input.name.trim(),
      email,
      companyName: org.name,
      slug: org.slug,
    });

    return {
      userId: created.userId,
      email: created.email,
      tempPassword: created.tempPassword,
      loginUrl: created.loginUrl,
      emailSent: created.emailSent,
      emailWarning: created.emailWarning,
    };
  }

  async setTenantAdminStatus(tenantId: string, userId: string, status: 'active' | 'suspended') {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: tenantId, systemRole: 'org_admin' },
    });
    if (!user) {
      throw new NotFoundException('Admin not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    return { userId, status };
  }

  async deleteTenant(id: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, slug: { not: 'platform' } },
    });
    if (!org) {
      throw new NotFoundException('Tenant not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.otpChallenge.deleteMany({ where: { organizationId: id } });
      await tx.lead.deleteMany({ where: { organizationId: id } });
      await tx.contact.deleteMany({ where: { organizationId: id } });
      await tx.company.deleteMany({ where: { organizationId: id } });
      await tx.deal.deleteMany({ where: { organizationId: id } });
      await tx.order.deleteMany({ where: { organizationId: id } });
      await tx.user.updateMany({ where: { organizationId: id }, data: { teamId: null, customRoleId: null } });
      await tx.team.deleteMany({ where: { organizationId: id } });
      await tx.permissionPreset.deleteMany({ where: { organizationId: id } });
      await tx.customRole.deleteMany({ where: { organizationId: id } });
      await tx.user.deleteMany({ where: { organizationId: id } });
      await tx.organization.delete({ where: { id } });
    });

    this.logger.log(`Deleted tenant ${org.name} (${org.slug})`);
    return { deleted: true as const, id };
  }

  private async createOrgAdminUser(input: {
    organizationId: string;
    name: string;
    email: string;
    companyName: string;
    slug: string;
  }) {
    const tempPassword = randomBytes(4).toString('hex') + 'A1!';
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await bcrypt.hash(tempPassword, 12),
        inviteTempPassword: tempPassword,
        systemRole: 'org_admin',
        status: 'invited',
        organizationId: input.organizationId,
      },
    });

    const loginUrl = `${tenantWebUrl(input.slug)}/login`;

    if (isEmailMockMode()) {
      this.logger.warn(
        `[Admin provisioned] ${input.slug} — ${input.email} / temp: ${tempPassword} — ${loginUrl}`,
      );
    }

    const emailResult = await this.email.sendTenantInviteEmail({
      to: input.email,
      ownerName: input.name,
      companyName: input.companyName,
      loginUrl,
      email: input.email,
      tempPassword,
      roleLabel: 'Organization Admin',
    });

    return {
      userId: user.id,
      email: input.email,
      tempPassword,
      loginUrl,
      emailSent: emailResult.sent,
      emailWarning: emailResult.error,
    };
  }

  private toTenantUser(user: {
    id: string;
    organizationId: string | null;
    name: string;
    email: string;
    systemRole: string;
    customRoleId: string | null;
    permissionGrants: string[];
    permissionDenies: string[];
    status: string;
    lastSeenAt: Date | null;
  }): TenantUser {
    return {
      id: user.id,
      organizationId: user.organizationId ?? '00000000-0000-4000-8000-000000000000',
      name: user.name,
      email: user.email,
      systemRole: user.systemRole as TenantUser['systemRole'],
      customRoleId: user.customRoleId ?? undefined,
      permissionGrants: user.permissionGrants as TenantUser['permissionGrants'],
      permissionDenies: user.permissionDenies as TenantUser['permissionDenies'],
      status: user.status as TenantUser['status'],
      lastSeenAt: user.lastSeenAt?.toISOString(),
    };
  }

  private toTenant(row: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    phone?: string | null;
    createdAt: Date;
    ownerUserId?: string;
  }): Tenant {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      plan: row.plan as Tenant['plan'],
      status: row.status as Tenant['status'],
      phone: row.phone ?? null,
      ownerUserId: row.ownerUserId ?? '00000000-0000-4000-8000-000000000000',
      createdAt: row.createdAt.toISOString(),
    };
  }
}

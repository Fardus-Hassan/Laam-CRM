import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { AuthSession, OtpChallengeResponse } from '@laam/types';

import { PermissionResolverService } from '../common/permission-resolver.service';
import { NotificationsService } from '../crm/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { OtpChallengeResult } from './otp.service';
import { OtpService } from './otp.service';
import { summarizeUserAgent } from './user-agent.util';

type UserWithOrg = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  systemRole: string;
  status: string;
  organizationId: string | null;
  customRoleId: string | null;
  permissionGrants: string[];
  permissionDenies: string[];
  customRole?: { permissions: string[] } | null;
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    branding?: unknown;
  } | null;
};

export type LoginSuccess = AuthSession & { accessToken: string };

export type LoginDeviceOtpRequired = {
  requiresDeviceOtp: true;
  challengeId: string;
  email: string;
} & OtpChallengeResponse;

export type LoginResult = LoginSuccess | LoginDeviceOtpRequired;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly otp: OtpService,
    private readonly permissionResolver: PermissionResolverService,
    private readonly notifications: NotificationsService,
  ) {}

  private emitSafe(task: Promise<unknown>) {
    void task.catch((error) => {
      this.logger.warn(
        `Notification emit failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }

  async login(
    email: string,
    password: string,
    tenantSlug: string | null,
    deviceId: string,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<LoginResult> {
    if (!deviceId?.trim()) {
      throw new BadRequestException('Device id is required');
    }

    const user = await this.findUserWithOrg(email);
    if (!user || user.status === 'suspended') {
      await this.recordLoginAudit({
        organizationId: user?.organizationId ?? null,
        userId: user?.id ?? null,
        userName: user?.name ?? email,
        email,
        status: 'failed',
        deviceId,
        meta,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await this.recordLoginAudit({
        organizationId: user.organizationId,
        userId: user.id,
        userName: user.name,
        email: user.email,
        status: 'failed',
        deviceId,
        meta,
      });
      if (user.organizationId) {
        try {
          await this.notifications.notifyUsersWithPermission({
            organizationId: user.organizationId,
            type: 'failed_login',
            title: 'Failed login attempt',
            body: `Someone tried to sign in as ${user.email} with an incorrect password.`,
            href: '/dashboard/users',
          });
        } catch (error) {
          this.logger.warn(
            `Failed-login notify failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    this.assertLoginContext(user, tenantSlug);

    const trusted = await this.prisma.trustedDevice.findUnique({
      where: { userId_deviceId: { userId: user.id, deviceId: deviceId.trim() } },
    });
    if (trusted) {
      const session = await this.issueLoginSession(user);
      await this.recordLoginAudit({
        organizationId: user.organizationId,
        userId: user.id,
        userName: user.name,
        email: user.email,
        status: 'success',
        deviceId,
        meta,
      });
      return session;
    }

    const delivery = this.otpDeliveryForUser(user);
    const challenge = await this.otp.createChallenge({
      purpose: 'new_device',
      email: user.email,
      userId: user.id,
      organizationId: user.organizationId,
      delivery,
    });

    if (user.organizationId) {
      this.emitSafe(
        this.notifications.create({
          organizationId: user.organizationId,
          userId: user.id,
          type: 'system',
          title: 'New device verification',
          body: 'A sign-in from a new device needs your verification code.',
          href: '/dashboard/settings/security',
        }),
      );
    }

    return {
      requiresDeviceOtp: true,
      email: user.email,
      ...this.toOtpChallengeResponse(challenge),
    };
  }

  async loginVerifyDevice(
    email: string,
    deviceId: string,
    code: string,
    tenantSlug: string | null,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<LoginSuccess> {
    if (!deviceId?.trim()) {
      throw new BadRequestException('Device id is required');
    }

    const user = await this.findUserWithOrg(email);
    if (!user || user.status === 'suspended') {
      throw new UnauthorizedException('Invalid request');
    }

    this.assertLoginContext(user, tenantSlug);

    await this.otp.verify({ email: user.email, purpose: 'new_device', code });

    await this.prisma.trustedDevice.upsert({
      where: { userId_deviceId: { userId: user.id, deviceId: deviceId.trim() } },
      create: { userId: user.id, deviceId: deviceId.trim() },
      update: { trustedAt: new Date() },
    });

    const session = await this.issueLoginSession(user);
    await this.recordLoginAudit({
      organizationId: user.organizationId,
      userId: user.id,
      userName: user.name,
      email: user.email,
      status: 'success',
      deviceId,
      meta,
    });
    return session;
  }

  async getSession(userId: string): Promise<AuthSession | null> {
    const user = await this.findUserWithOrgById(userId);
    if (!user || user.status === 'suspended') {
      return null;
    }

    return this.toSession(user);
  }

  async forgotPassword(email: string, tenantSlug: string | null) {
    const user = await this.findUserWithOrg(email);

    if (!user) {
      throw new NotFoundException('No account found for this email on this company');
    }

    this.assertLoginContext(user, tenantSlug);

    const challenge = await this.otp.createChallenge({
      purpose: 'forgot_password',
      email: user.email,
      userId: user.id,
      organizationId: user.organizationId,
      delivery: this.otpDeliveryForUser(user),
    });

    if (user.organizationId) {
      this.emitSafe(
        this.notifications.create({
          organizationId: user.organizationId,
          userId: user.id,
          type: 'system',
          title: 'Password reset requested',
          body: 'A verification code was sent to reset your password. If this was not you, contact an admin.',
          href: '/dashboard/settings/security',
        }),
      );
    }

    return {
      found: true as const,
      ...this.toOtpChallengeResponse(challenge),
      message: 'Verification code sent',
    };
  }

  async verifyForgotPasswordCode(email: string, code: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.findUserWithOrg(normalizedEmail);
    if (!user) {
      throw new NotFoundException('No account found for this email on this company');
    }

    await this.otp.verify({ email: normalizedEmail, purpose: 'forgot_password', code });

    const resetToken = this.jwt.sign(
      { sub: user.id, email: user.email, purpose: 'forgot_reset' },
      { expiresIn: '10m' },
    );

    return { resetToken, message: 'Code verified' };
  }

  async resetPasswordWithToken(resetToken: string, newPassword: string) {
    let payload: { sub?: string; email?: string; purpose?: string };
    try {
      payload = this.jwt.verify(resetToken) as typeof payload;
    } catch {
      throw new UnauthorizedException('Reset session expired or invalid — verify OTP again');
    }

    if (payload.purpose !== 'forgot_reset' || !payload.sub) {
      throw new UnauthorizedException('Invalid reset token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Invalid reset token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 12),
        inviteTempPassword: null,
      },
    });

    return { message: 'Password updated' };
  }

  async resendOtp(challengeId: string) {
    const challenge = await this.otp.resend(challengeId);
    return {
      ...this.toOtpChallengeResponse(challenge),
      message: 'OTP resent',
    };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    await this.otp.verify({ email, purpose: 'forgot_password', code });

    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid request');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 12),
        inviteTempPassword: null,
      },
    });

    return { message: 'Password updated' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const challenge = await this.otp.createChallenge({
      purpose: 'change_password',
      email: user.email,
      userId: user.id,
      organizationId: user.organizationId,
      delivery: this.otpDeliveryForUser(user),
    });

    return {
      requiresOtp: true as const,
      ...this.toOtpChallengeResponse(challenge),
    };
  }

  async confirmChangePassword(userId: string, code: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }

    await this.otp.verify({ email: user.email, purpose: 'change_password', code });
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 12),
        inviteTempPassword: null,
      },
    });

    return { message: 'Password updated' };
  }

  async verifyDevice(userId: string, deviceId: string, code: string, email: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }

    await this.otp.verify({ email, purpose: 'new_device', code });

    await this.prisma.trustedDevice.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      create: { userId, deviceId },
      update: { trustedAt: new Date() },
    });

    return { message: 'Device trusted' };
  }

  async requestDeviceOtp(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }

    const challenge = await this.otp.createChallenge({
      purpose: 'new_device',
      email: user.email,
      userId: user.id,
      organizationId: user.organizationId,
      delivery: this.otpDeliveryForUser(user),
    });

    return this.toOtpChallengeResponse(challenge);
  }

  listOtpInbox(organizationId: string) {
    return this.otp.listAdminInbox(organizationId);
  }

  resolveOtpCopyToken(token: string) {
    let payload: { purpose?: string; code?: string; email?: string; challengeId?: string };
    try {
      payload = this.jwt.verify(token) as typeof payload;
    } catch {
      throw new UnauthorizedException('Copy link expired or invalid');
    }

    if (payload.purpose !== 'otp_copy' || !payload.code) {
      throw new UnauthorizedException('Invalid copy link');
    }

    return {
      code: payload.code,
      email: payload.email ?? null,
    };
  }

  signToken(user: { id: string; email: string; systemRole: string; organizationId: string | null }) {
    return this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.systemRole,
      organizationId: user.organizationId,
    });
  }

  private async recordLoginAudit(input: {
    organizationId: string | null;
    userId: string | null;
    userName: string;
    email: string;
    status: 'success' | 'failed';
    deviceId: string;
    meta?: { ip?: string; userAgent?: string };
  }) {
    try {
      const ua = input.meta?.userAgent?.trim();
      const device = ua
        ? summarizeUserAgent(ua)
        : summarizeUserAgent(`device:${input.deviceId.trim().slice(0, 64)}`);
      await this.prisma.loginAudit.create({
        data: {
          organizationId: input.organizationId,
          userId: input.userId,
          userName: input.userName,
          email: input.email.trim().toLowerCase(),
          ip: input.meta?.ip?.trim() || 'unknown',
          device,
          status: input.status,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Login audit failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async issueLoginSession(user: UserWithOrg): Promise<LoginSuccess> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastSeenAt: new Date(),
        status: user.status === 'invited' ? 'active' : undefined,
      },
    });

    const session = await this.toSession({
      ...user,
      status: user.status === 'invited' ? 'active' : user.status,
    });
    const accessToken = this.signToken(user);
    return { ...session, accessToken };
  }

  private toOtpChallengeResponse(challenge: OtpChallengeResult): OtpChallengeResponse {
    const isMock = process.env['EMAIL_MODE'] === 'mock';
    return {
      challengeId: challenge.challengeId,
      expiresAt: challenge.expiresAt.toISOString(),
      resendAfter: challenge.resendAfter.toISOString(),
      delivery: challenge.delivery,
      message: this.deliveryMessage(challenge.delivery),
      devOtp: isMock ? challenge.code : undefined,
    };
  }

  private deliveryMessage(delivery: 'email' | 'admin_inbox'): string {
    if (delivery === 'admin_inbox') {
      return 'Contact your Organization Admin — the OTP is in their Security inbox.';
    }
    return 'Check your email for the verification code.';
  }

  private async findUserWithOrg(email: string): Promise<UserWithOrg | null> {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { organization: true, customRole: true },
    });
  }

  private async findUserWithOrgById(userId: string): Promise<UserWithOrg | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true, customRole: true },
    });
  }

  private assertLoginContext(user: UserWithOrg, tenantSlug: string | null) {
    if (user.systemRole === 'super_admin') {
      if (tenantSlug) {
        throw new ForbiddenException('Super admin must sign in on the platform domain');
      }
      return;
    }

    if (!tenantSlug) {
      throw new ForbiddenException('Use your company subdomain to sign in');
    }

    if (!user.organization || user.organization.slug !== tenantSlug) {
      throw new ForbiddenException('This account does not belong to this company');
    }

    if (user.organization.status === 'suspended') {
      throw new ForbiddenException('This company account is suspended');
    }
  }

  private otpDeliveryForUser(user: { systemRole: string }): 'email' | 'admin_inbox' {
    if (user.systemRole === 'super_admin' || user.systemRole === 'org_admin') {
      return 'email';
    }
    return 'admin_inbox';
  }

  private async toSession(user: UserWithOrg): Promise<AuthSession> {
    const organization = user.organization ?? {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Laam Platform',
      slug: 'platform',
      plan: 'Enterprise',
    };

    const permissions = await this.permissionResolver.resolveFromUserRow(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.systemRole as AuthSession['user']['role'],
        organizationId: organization.id,
        customRoleId: user.customRoleId ?? undefined,
        permissionGrants: user.permissionGrants as AuthSession['user']['permissionGrants'],
        permissionDenies: user.permissionDenies as AuthSession['user']['permissionDenies'],
        permissions,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
        branding: (() => {
          const raw =
            'branding' in organization ? organization.branding : undefined;
          if (!raw || typeof raw !== 'object') {
            return undefined;
          }
          const branding = raw as NonNullable<AuthSession['organization']['branding']>;
          if (!branding.colors && !branding.logos?.light && !branding.logos?.dark) {
            return undefined;
          }
          return branding;
        })(),
      },
    };
  }
}

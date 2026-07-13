import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { AuthSession, OtpChallengeResponse } from '@laam/types';

import { PermissionResolverService } from '../common/permission-resolver.service';
import { PrismaService } from '../prisma/prisma.service';
import type { OtpChallengeResult } from './otp.service';
import { OtpService } from './otp.service';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly otp: OtpService,
    private readonly permissionResolver: PermissionResolverService,
  ) {}

  async login(
    email: string,
    password: string,
    tenantSlug: string | null,
    deviceId: string,
  ): Promise<LoginResult> {
    if (!deviceId?.trim()) {
      throw new BadRequestException('Device id is required');
    }

    const user = await this.findUserWithOrg(email);
    if (!user || user.status === 'suspended') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.assertLoginContext(user, tenantSlug);

    const trusted = await this.prisma.trustedDevice.findUnique({
      where: { userId_deviceId: { userId: user.id, deviceId: deviceId.trim() } },
    });
    if (trusted) {
      return this.issueLoginSession(user);
    }

    const delivery = this.otpDeliveryForUser(user);
    const challenge = await this.otp.createChallenge({
      purpose: 'new_device',
      email: user.email,
      userId: user.id,
      organizationId: user.organizationId,
      delivery,
    });

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

    return this.issueLoginSession(user);
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
      },
    };
  }
}

import { randomInt } from 'node:crypto';

import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { OtpInboxItem } from '@laam/types';

import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import type { OtpDelivery, OtpPurpose } from './otp.types';

const OTP_TTL_MS = 5 * 60_000;
const RESEND_COOLDOWN_MS = 60_000;
const MAX_ATTEMPTS = 5;

export type OtpChallengeResult = {
  challengeId: string;
  code: string;
  expiresAt: Date;
  resendAfter: Date;
  delivery: OtpDelivery;
};

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  private generateCode(): string {
    return String(randomInt(100000, 999999));
  }

  async createChallenge(input: {
    purpose: OtpPurpose;
    email: string;
    userId?: string;
    organizationId?: string | null;
    delivery: OtpDelivery;
  }): Promise<OtpChallengeResult> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.otpChallenge.findFirst({
      where: {
        email,
        purpose: input.purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing && existing.resendAfter > new Date()) {
      throw new HttpException('Wait 1 minute before requesting another OTP', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = this.generateCode();
    const now = new Date();
    const challenge = await this.prisma.otpChallenge.create({
      data: {
        purpose: input.purpose,
        email,
        userId: input.userId,
        organizationId: input.organizationId ?? undefined,
        codeHash: await bcrypt.hash(code, 10),
        relayCode: input.delivery === 'admin_inbox' ? code : null,
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
        resendAfter: new Date(now.getTime() + RESEND_COOLDOWN_MS),
        delivery: input.delivery,
      },
    });

    await this.deliverOtp({
      delivery: input.delivery,
      email,
      purpose: input.purpose,
      code,
      organizationId: input.organizationId,
    });

    return {
      challengeId: challenge.id,
      code,
      expiresAt: challenge.expiresAt,
      resendAfter: challenge.resendAfter,
      delivery: input.delivery,
    };
  }

  async resend(challengeId: string): Promise<OtpChallengeResult> {
    const previous = await this.prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    if (!previous || previous.consumedAt) {
      throw new NotFoundException('OTP challenge not found');
    }

    if (previous.resendAfter > new Date()) {
      throw new HttpException('Wait 1 minute before resending OTP', HttpStatus.TOO_MANY_REQUESTS);
    }

    return this.createChallenge({
      purpose: previous.purpose as OtpPurpose,
      email: previous.email,
      userId: previous.userId ?? undefined,
      organizationId: previous.organizationId,
      delivery: previous.delivery as OtpDelivery,
    });
  }

  async verify(input: {
    email: string;
    purpose: OtpPurpose;
    code: string;
  }): Promise<{ challengeId: string; userId: string | null; organizationId: string | null }> {
    const email = input.email.trim().toLowerCase();
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        email,
        purpose: input.purpose,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (challenge.expiresAt < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    if (challenge.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException('Too many OTP attempts');
    }

    const valid = await bcrypt.compare(input.code, challenge.codeHash);
    if (!valid) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date(), relayCode: null },
    });

    return {
      challengeId: challenge.id,
      userId: challenge.userId,
      organizationId: challenge.organizationId,
    };
  }

  async listAdminInbox(organizationId: string): Promise<OtpInboxItem[]> {
    const rows = await this.prisma.otpChallenge.findMany({
      where: {
        organizationId,
        delivery: 'admin_inbox',
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      userName: row.user?.name ?? null,
      purpose: row.purpose as OtpInboxItem['purpose'],
      delivery: row.delivery as OtpInboxItem['delivery'],
      relayCode: row.relayCode,
      expiresAt: row.expiresAt.toISOString(),
      resendAfter: row.resendAfter.toISOString(),
      attempts: row.attempts,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  private async deliverOtp(input: {
    delivery: OtpDelivery;
    email: string;
    purpose: OtpPurpose;
    code: string;
    organizationId?: string | null;
  }) {
    if (input.delivery === 'admin_inbox') {
      this.logger.warn(
        `[Admin OTP inbox] ${input.purpose} for ${input.email}: ${input.code} (org: ${input.organizationId ?? 'n/a'})`,
      );
      return;
    }

    await this.email.sendOtpEmail(input.email, input.code, input.purpose);
  }
}

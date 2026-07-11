import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type Transporter from 'nodemailer/lib/mailer';

import type { OtpPurpose } from '../auth/otp.types';
import { isEmailMockMode, isEmailSmtpMode } from '../common/tenant.util';
import { buildOtpEmail, buildTenantInviteEmail } from './email.templates';
import { stripEnvQuotes } from './email.util';

export type EmailSendResult = {
  sent: boolean;
  error?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = stripEnvQuotes(process.env['SMTP_HOST']);
    const port = Number(stripEnvQuotes(process.env['SMTP_PORT']) ?? 587);
    const user = stripEnvQuotes(process.env['SMTP_USER']);
    const pass = stripEnvQuotes(process.env['SMTP_PASS']);

    if (!host || !user || !pass) {
      throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS are required when EMAIL_MODE=smtp');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    return this.transporter;
  }

  private get fromAddress(): string {
    return stripEnvQuotes(process.env['MAIL_FROM']) ?? 'Laam CRM <noreply@laamcrm.com>';
  }

  async sendOtpEmail(to: string, code: string, purpose: OtpPurpose): Promise<EmailSendResult> {
    const { subject, html, text } = buildOtpEmail(purpose, code, to);

    if (isEmailMockMode()) {
      this.logger.warn(`[Laam OTP] ${purpose} for ${to}: ${code} (expires in 5 min)`);
      return { sent: true };
    }

    if (!isEmailSmtpMode()) {
      this.logger.warn(`[Email skipped] EMAIL_MODE is not smtp — ${purpose} for ${to}`);
      return { sent: false, error: 'EMAIL_MODE is not smtp' };
    }

    const result = await this.sendMail({ to, subject, html, text });
    if (result.sent) {
      this.logger.log(`OTP email sent (${purpose}) → ${to}`);
    }
    return result;
  }

  async sendTenantInviteEmail(input: {
    to: string;
    ownerName: string;
    companyName: string;
    loginUrl: string;
    email: string;
    tempPassword: string;
    roleLabel?: string;
  }): Promise<EmailSendResult> {
    const { subject, html, text } = buildTenantInviteEmail({
      ownerName: input.ownerName,
      companyName: input.companyName,
      loginUrl: input.loginUrl,
      email: input.email,
      tempPassword: input.tempPassword,
      roleLabel: input.roleLabel,
    });

    if (isEmailMockMode()) {
      this.logger.warn(
        `[Tenant invite] ${input.companyName} → ${input.to}\n  URL: ${input.loginUrl}\n  Temp password: ${input.tempPassword}`,
      );
      return { sent: true };
    }

    if (!isEmailSmtpMode()) {
      this.logger.warn(`[Email skipped] tenant invite for ${input.to}`);
      return { sent: false, error: 'EMAIL_MODE is not smtp' };
    }

    const result = await this.sendMail({ to: input.to, subject, html, text });
    if (result.sent) {
      this.logger.log(`Tenant invite email sent → ${input.to} (${input.companyName})`);
    }
    return result;
  }

  private async sendMail(message: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<EmailSendResult> {
    try {
      await this.getTransporter().sendMail({
        from: this.fromAddress,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      return { sent: true };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${message.to}: ${detail}`);
      return { sent: false, error: detail };
    }
  }
}

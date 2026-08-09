import type { OtpPurpose } from '../auth/otp.types';

const BRAND_GREEN = '#0d7a3f';
const BRAND_GREEN_DARK = '#065a2d';
const ACCENT_GOLD = '#f5c518';

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f2;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f4f2;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(6,90,45,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_GREEN} 0%,${BRAND_GREEN_DARK} 100%);padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Laam CRM</p>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">Enterprise CRM Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background:#f8faf9;padding:20px 32px;text-align:center;border-top:1px solid #e8efe9;">
              <p style="margin:0;font-size:12px;color:#6b7c72;">© Laam CRM · This is an automated message, please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const OTP_PURPOSE_COPY: Record<
  OtpPurpose,
  { subject: string; headline: string; description: string }
> = {
  forgot_password: {
    subject: 'Laam CRM — Password reset code',
    headline: 'Reset your password',
    description:
      'We received a request to reset your password. Use the verification code below. It expires in <strong>5 minutes</strong>.',
  },
  change_password: {
    subject: 'Laam CRM — Confirm password change',
    headline: 'Verify password change',
    description:
      'Use this code to confirm your new password. It expires in <strong>5 minutes</strong>.',
  },
  new_device: {
    subject: 'Laam CRM — New device verification',
    headline: 'Verify new device',
    description:
      'A sign-in was attempted from a new device. Enter this code to continue. Expires in <strong>5 minutes</strong>.',
  },
  tenant_invite: {
    subject: 'Laam CRM — Verification code',
    headline: 'Your verification code',
    description: 'Use this code to complete your request. Expires in <strong>5 minutes</strong>.',
  },
};

export function buildOtpEmail(purpose: OtpPurpose, code: string, recipientEmail: string) {
  const copy = OTP_PURPOSE_COPY[purpose];

  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;color:#1a2e24;">${copy.headline}</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a5c52;">${copy.description}</p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;">
      <tr>
        <td align="center" style="padding:18px 32px;background:#f0f9f4;border:2px solid ${BRAND_GREEN};border-radius:12px;">
          <span style="font-family:Consolas,'Courier New',monospace;font-size:36px;font-weight:700;letter-spacing:6px;color:${BRAND_GREEN_DARK};user-select:all;-webkit-user-select:all;">${code}</span>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7c72;text-align:center;">Code for <strong>${recipientEmail}</strong></p>
    <p style="margin:16px 0 0;padding:14px 16px;background:#fff8e6;border-left:4px solid ${ACCENT_GOLD};border-radius:8px;font-size:13px;color:#5c4a12;line-height:1.5;">
      <strong>Security tip:</strong> Never share this code. Laam staff will never ask for your OTP.
    </p>`;

  return {
    subject: copy.subject,
    html: layout(copy.headline, body),
    text: `${copy.headline}\n\nYour code: ${code}\n\nExpires in 5 minutes.\nAccount: ${recipientEmail}`,
  };
}

export function buildTenantInviteEmail(input: {
  ownerName: string;
  companyName: string;
  loginUrl: string;
  email: string;
  tempPassword: string;
  roleLabel?: string;
}) {
  const role = input.roleLabel ?? 'Organization Admin';
  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#1a2e24;">Welcome to Laam CRM</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a5c52;">
      Hello <strong>${input.ownerName}</strong>, your company <strong>${input.companyName}</strong> is ready on Laam CRM.
      Sign in with the credentials below and change your password after first login.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:#f8faf9;border:1px solid #e0ebe4;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:14px 18px;font-size:12px;font-weight:600;color:#6b7c72;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e0ebe4;">Your access</td>
      </tr>
      <tr>
        <td style="padding:12px 18px;font-size:14px;color:#1a2e24;"><span style="color:#6b7c72;">Role</span><br/><strong>${role}</strong></td>
      </tr>
      <tr>
        <td style="padding:12px 18px;font-size:14px;color:#1a2e24;border-top:1px solid #e8efe9;"><span style="color:#6b7c72;">Login URL</span><br/><a href="${input.loginUrl}" style="color:${BRAND_GREEN};font-weight:600;text-decoration:none;">${input.loginUrl}</a></td>
      </tr>
      <tr>
        <td style="padding:12px 18px;font-size:14px;color:#1a2e24;border-top:1px solid #e8efe9;"><span style="color:#6b7c72;">Email</span><br/><strong>${input.email}</strong></td>
      </tr>
      <tr>
        <td style="padding:12px 18px;font-size:14px;color:#1a2e24;border-top:1px solid #e8efe9;"><span style="color:#6b7c72;">Temporary password</span><br/><code style="background:#f0f9f4;padding:6px 12px;border-radius:6px;font-size:16px;font-weight:700;color:${BRAND_GREEN_DARK};letter-spacing:1px;">${input.tempPassword}</code></td>
      </tr>
    </table>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
      <tr>
        <td style="background:linear-gradient(135deg,${BRAND_GREEN} 0%,${BRAND_GREEN_DARK} 100%);border-radius:999px;">
          <a href="${input.loginUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Sign in to ${input.companyName}</a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7c72;line-height:1.5;text-align:center;">
      If you did not expect this invitation, you can safely ignore this email.
    </p>`;

  return {
    subject: `Laam CRM — Welcome to ${input.companyName}`,
    html: layout(`Welcome to ${input.companyName}`, body),
    text: `Welcome to Laam CRM\n\nCompany: ${input.companyName}\nLogin: ${input.loginUrl}\nEmail: ${input.email}\nTemporary password: ${input.tempPassword}\nRole: ${role}`,
  };
}

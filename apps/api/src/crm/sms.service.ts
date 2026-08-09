import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  SendSmsResult,
  SmsIntegrationSettings,
  SmsTemplate,
  UpsertSmsIntegrationPayload,
  UpsertSmsTemplatePayload,
} from '@laam/types';

import type { ActorLabel } from '../common/actor.util';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret, encryptSecret } from './credentials-crypto.util';

type StoredSmsSecrets = {
  apiUrl: string;
  httpMethod: 'GET' | 'POST';
  paramsTemplate: string;
  headersJson?: string | null;
};

const DEFAULT_TEMPLATES: Array<{
  slug: string;
  label: string;
  message: string;
  sortOrder: number;
}> = [
  {
    slug: 'confirm',
    label: 'Order confirmed',
    message:
      'Hi {customer_name}, Your order {invoice_id} has been confirmed. Thank you for choosing {business_name}.',
    sortOrder: 10,
  },
  {
    slug: 'in_courier',
    label: 'In courier',
    message:
      'Hi {customer_name}, Your order {invoice_id} is on the way. Tracking: {courier_invoice}. — {business_name}',
    sortOrder: 20,
  },
  {
    slug: 'delivered',
    label: 'Delivered',
    message:
      'Hi {customer_name}, Your order {invoice_id} has been delivered. Thank you — {business_name}.',
    sortOrder: 30,
  },
  {
    slug: 'custom',
    label: 'Custom message',
    message: '',
    sortOrder: 100,
  },
];

@Injectable()
export class SmsService {
  constructor(private readonly prisma: PrismaService) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) throw new BadRequestException('Organization required');
  }

  async getPublic(organizationId: string): Promise<SmsIntegrationSettings> {
    const row = await this.prisma.smsIntegration.findUnique({
      where: { organizationId },
    });
    if (!row) {
      return {
        provider: 'custom',
        enabled: false,
        hasCredentials: false,
        apiUrlMasked: null,
        httpMethod: 'GET',
        paramsTemplateMasked: null,
        hasHeaders: false,
        autoSmsOnStatusChange: false,
        statusSmsMap: {},
        lastSentAt: null,
        lastError: null,
        updatedAt: new Date().toISOString(),
      };
    }

    let secrets: StoredSmsSecrets | null = null;
    if (row.credentialsEnc) {
      try {
        secrets = JSON.parse(decryptSecret(row.credentialsEnc)) as StoredSmsSecrets;
      } catch {
        secrets = null;
      }
    }

    const statusSmsMap =
      row.statusSmsMap && typeof row.statusSmsMap === 'object' && !Array.isArray(row.statusSmsMap)
        ? (row.statusSmsMap as Record<string, string>)
        : {};

    return {
      provider: 'custom',
      enabled: row.enabled,
      hasCredentials: Boolean(secrets?.apiUrl && secrets?.paramsTemplate),
      apiUrlMasked: secrets?.apiUrl ? maskUrl(secrets.apiUrl) : null,
      httpMethod: secrets?.httpMethod === 'POST' ? 'POST' : 'GET',
      paramsTemplateMasked: secrets?.paramsTemplate
        ? maskParamsTemplate(secrets.paramsTemplate)
        : null,
      hasHeaders: Boolean(secrets?.headersJson?.trim()),
      autoSmsOnStatusChange: row.autoSmsOnStatusChange ?? false,
      statusSmsMap,
      lastSentAt: row.lastSentAt?.toISOString() ?? null,
      lastError: row.lastError,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async upsert(
    organizationId: string,
    input: UpsertSmsIntegrationPayload,
  ): Promise<SmsIntegrationSettings> {
    const existing = await this.prisma.smsIntegration.findUnique({
      where: { organizationId },
    });

    let secrets: StoredSmsSecrets | null = null;
    if (existing?.credentialsEnc) {
      try {
        secrets = JSON.parse(decryptSecret(existing.credentialsEnc)) as StoredSmsSecrets;
      } catch {
        secrets = null;
      }
    }

    if (input.paramsTemplate?.includes('***')) {
      throw new BadRequestException(
        'Paste the full Parameters string with your real api_token (masked *** values cannot be saved).',
      );
    }

    const next: StoredSmsSecrets = {
      apiUrl: input.apiUrl?.trim() || secrets?.apiUrl || '',
      httpMethod: input.httpMethod ?? secrets?.httpMethod ?? 'GET',
      paramsTemplate:
        input.paramsTemplate !== undefined
          ? input.paramsTemplate.trim()
          : secrets?.paramsTemplate || '',
      headersJson:
        input.headersJson === undefined
          ? secrets?.headersJson ?? null
          : input.headersJson?.trim() || null,
    };

    if (!next.apiUrl || !next.paramsTemplate) {
      throw new BadRequestException('apiUrl and paramsTemplate are required');
    }
    if (
      !next.paramsTemplate.includes('{mobile_number}') ||
      !next.paramsTemplate.includes('{sms_text}')
    ) {
      throw new BadRequestException(
        'paramsTemplate must include {mobile_number} and {sms_text}',
      );
    }

    await this.prisma.smsIntegration.upsert({
      where: { organizationId },
      create: {
        organizationId,
        provider: 'custom',
        enabled: input.enabled ?? false,
        credentialsEnc: encryptSecret(JSON.stringify(next)),
        autoSmsOnStatusChange: input.autoSmsOnStatusChange ?? false,
        statusSmsMap: input.statusSmsMap ?? {},
        lastError: null,
      },
      update: {
        enabled: input.enabled ?? existing?.enabled ?? false,
        credentialsEnc: encryptSecret(JSON.stringify(next)),
        ...(input.autoSmsOnStatusChange !== undefined
          ? { autoSmsOnStatusChange: input.autoSmsOnStatusChange }
          : {}),
        ...(input.statusSmsMap !== undefined ? { statusSmsMap: input.statusSmsMap } : {}),
        lastError: null,
      },
    });

    await this.ensureDefaultTemplates(organizationId);
    return this.getPublic(organizationId);
  }

  async disconnect(organizationId: string): Promise<SmsIntegrationSettings> {
    await this.prisma.smsIntegration.deleteMany({ where: { organizationId } });
    return this.getPublic(organizationId);
  }

  /** Update auto-SMS toggle/map without requiring credential re-entry. */
  async updateStatusAutomation(
    organizationId: string,
    input: { autoSmsOnStatusChange?: boolean; statusSmsMap?: Record<string, string> },
  ): Promise<SmsIntegrationSettings> {
    const existing = await this.prisma.smsIntegration.findUnique({
      where: { organizationId },
    });
    if (!existing) {
      await this.prisma.smsIntegration.create({
        data: {
          organizationId,
          provider: 'custom',
          enabled: false,
          autoSmsOnStatusChange: input.autoSmsOnStatusChange ?? false,
          statusSmsMap: input.statusSmsMap ?? {},
        },
      });
    } else {
      await this.prisma.smsIntegration.update({
        where: { organizationId },
        data: {
          ...(input.autoSmsOnStatusChange !== undefined
            ? { autoSmsOnStatusChange: input.autoSmsOnStatusChange }
            : {}),
          ...(input.statusSmsMap !== undefined ? { statusSmsMap: input.statusSmsMap } : {}),
        },
      });
    }
    await this.ensureDefaultTemplates(organizationId);
    return this.getPublic(organizationId);
  }

  async listTemplates(organizationId: string): Promise<SmsTemplate[]> {
    await this.ensureDefaultTemplates(organizationId);
    const rows = await this.prisma.smsTemplate.findMany({
      where: { organizationId },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(toTemplateDto);
  }

  async upsertTemplate(
    organizationId: string,
    input: UpsertSmsTemplatePayload,
  ): Promise<SmsTemplate> {
    const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    if (!slug) throw new BadRequestException('slug required');
    if (!input.label.trim()) throw new BadRequestException('label required');

    if (input.id) {
      const existing = await this.prisma.smsTemplate.findFirst({
        where: { id: input.id, organizationId },
      });
      if (!existing) throw new NotFoundException('Template not found');
      const row = await this.prisma.smsTemplate.update({
        where: { id: existing.id },
        data: {
          slug,
          label: input.label.trim(),
          message: input.message,
          enabled: input.enabled ?? existing.enabled,
          sortOrder: input.sortOrder ?? existing.sortOrder,
        },
      });
      return toTemplateDto(row);
    }

    const row = await this.prisma.smsTemplate.upsert({
      where: { organizationId_slug: { organizationId, slug } },
      create: {
        organizationId,
        slug,
        label: input.label.trim(),
        message: input.message,
        enabled: input.enabled ?? true,
        sortOrder: input.sortOrder ?? 50,
      },
      update: {
        label: input.label.trim(),
        message: input.message,
        enabled: input.enabled ?? true,
        sortOrder: input.sortOrder ?? 50,
      },
    });
    return toTemplateDto(row);
  }

  async testSend(
    organizationId: string,
    phone: string,
    message?: string,
    actor?: ActorLabel,
  ): Promise<SendSmsResult> {
    const text =
      message?.trim() ||
      `Laam CRM test SMS at ${new Date().toISOString().slice(0, 19)}`;
    return this.dispatch(organizationId, {
      phone,
      message: text,
      orderId: null,
      actor,
    });
  }

  async sendToOrder(
    organizationId: string,
    orderId: string,
    message: string,
    actor?: ActorLabel,
  ): Promise<SendSmsResult> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, organizationId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    const rendered = renderMessageTemplate(message, {
      customer_name: order.customerName,
      invoice_id: order.orderNumber,
      order_number: order.orderNumber,
      business_name: org?.name ?? 'Laam',
      phone: order.customerPhone,
      courier_invoice: order.courierConsignmentId ?? '',
      courier_tracking: order.courierTrackingCode ?? '',
      reference_no: order.referenceNo ?? '',
    });

    return this.dispatch(organizationId, {
      phone: order.customerPhone,
      message: rendered,
      orderId: order.id,
      actor,
    });
  }

  async sendBulkToOrders(
    organizationId: string,
    orderIds: string[],
    message: string,
    actor?: ActorLabel,
  ): Promise<{ successCount: number; failedCount: number; message: string }> {
    const ids = [...new Set(orderIds.map((id) => id.trim()).filter(Boolean))];
    let successCount = 0;
    let failedCount = 0;
    for (const id of ids) {
      try {
        await this.sendToOrder(organizationId, id, message, actor);
        successCount += 1;
      } catch {
        failedCount += 1;
      }
    }
    return {
      successCount,
      failedCount,
      message: `SMS sent to ${successCount} order(s)`,
    };
  }

  /** Fire-and-forget from order status change when org toggle + map are set. */
  async tryAutoSmsOnStatusChange(
    organizationId: string,
    orderId: string,
    statusSlug: string,
  ): Promise<void> {
    const integration = await this.prisma.smsIntegration.findUnique({
      where: { organizationId },
    });
    if (!integration?.enabled || !integration.autoSmsOnStatusChange) return;

    const map =
      integration.statusSmsMap &&
      typeof integration.statusSmsMap === 'object' &&
      !Array.isArray(integration.statusSmsMap)
        ? (integration.statusSmsMap as Record<string, string>)
        : {};
    const templateSlug = map[statusSlug]?.trim();
    if (!templateSlug) return;

    await this.ensureDefaultTemplates(organizationId);
    const template = await this.prisma.smsTemplate.findFirst({
      where: { organizationId, slug: templateSlug, enabled: true },
    });
    if (!template?.message?.trim()) return;

    await this.sendToOrder(organizationId, orderId, template.message);
  }

  private async ensureDefaultTemplates(organizationId: string): Promise<void> {
    const count = await this.prisma.smsTemplate.count({ where: { organizationId } });
    if (count > 0) return;
    await this.prisma.smsTemplate.createMany({
      data: DEFAULT_TEMPLATES.map((t) => ({
        organizationId,
        slug: t.slug,
        label: t.label,
        message: t.message,
        enabled: true,
        sortOrder: t.sortOrder,
      })),
    });
  }

  private async resolveSecrets(organizationId: string): Promise<StoredSmsSecrets> {
    const row = await this.prisma.smsIntegration.findUnique({
      where: { organizationId },
    });
    if (!row?.enabled) {
      throw new BadRequestException(
        'SMS is not enabled. Open Settings → Integrations → SMS, enable, and Save.',
      );
    }
    if (!row.credentialsEnc) {
      throw new BadRequestException('SMS credentials missing. Configure API URL and parameters.');
    }
    try {
      const secrets = JSON.parse(decryptSecret(row.credentialsEnc)) as StoredSmsSecrets;
      if (!secrets.apiUrl || !secrets.paramsTemplate) {
        throw new Error('incomplete');
      }
      return secrets;
    } catch {
      throw new BadRequestException('SMS credentials corrupt. Re-save in Settings → SMS.');
    }
  }

  private async dispatch(
    organizationId: string,
    input: {
      phone: string;
      message: string;
      orderId: string | null;
      actor?: ActorLabel;
    },
  ): Promise<SendSmsResult> {
    const secrets = await this.resolveSecrets(organizationId);
    const localMobile = normalizeBdLocalMobile(input.phone);
    if (!localMobile) {
      throw new BadRequestException('Invalid mobile number');
    }
    if (!input.message.trim()) {
      throw new BadRequestException('Message required');
    }

    const uniqueId = randomUUID().replace(/-/g, '').slice(0, 20);
    const filled = secrets.paramsTemplate
      .replaceAll(
        '{mobile_number}',
        secrets.httpMethod === 'GET' ? encodeURIComponent(localMobile) : localMobile,
      )
      .replaceAll(
        '{sms_text}',
        secrets.httpMethod === 'GET'
          ? encodeURIComponent(input.message.trim())
          : input.message.trim(),
      )
      .replaceAll(
        '{unique_id}',
        secrets.httpMethod === 'GET' ? encodeURIComponent(uniqueId) : uniqueId,
      );

    let headers: Record<string, string> = {};
    if (secrets.headersJson?.trim()) {
      try {
        headers = JSON.parse(secrets.headersJson) as Record<string, string>;
      } catch {
        throw new BadRequestException('headersJson must be valid JSON object');
      }
    }

    let responseText = '';
    let ok = false;
    let error: string | null = null;

    try {
      let httpStatus = 0;
      if (secrets.httpMethod === 'POST') {
        const res = await fetch(secrets.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...headers,
          },
          body: filled,
        });
        httpStatus = res.status;
        responseText = await res.text();
        ok = res.ok;
      } else {
        const joiner = secrets.apiUrl.includes('?') ? '&' : '?';
        const url = `${secrets.apiUrl}${joiner}${filled}`;
        const res = await fetch(url, { method: 'GET', headers });
        httpStatus = res.status;
        responseText = await res.text();
        ok = res.ok;
      }

      const providerError = parseSmsProviderError(responseText);
      if (providerError) {
        ok = false;
        error = providerError;
      } else if (!ok) {
        error = `HTTP ${httpStatus}: ${responseText.slice(0, 300)}`;
      }
    } catch (e) {
      ok = false;
      error = formatSmsNetworkError(e, secrets.apiUrl);
    }

    const log = await this.prisma.smsLog.create({
      data: {
        organizationId,
        orderId: input.orderId,
        toPhone: `88${localMobile}`,
        message: input.message.trim(),
        status: ok ? 'sent' : 'failed',
        providerRef: uniqueId,
        error,
      },
    });

    await this.prisma.smsIntegration.update({
      where: { organizationId },
      data: {
        lastSentAt: ok ? new Date() : undefined,
        lastError: ok ? null : error,
      },
    });

    if (input.orderId) {
      await this.prisma.orderActivity.create({
        data: {
          organizationId,
          orderId: input.orderId,
          type: 'sms',
          label: ok ? 'SMS sent' : 'SMS failed',
          description: input.message.trim().slice(0, 500),
          actorUserId: input.actor?.userId ?? null,
          actorName: input.actor?.name ?? null,
        },
      });
    }

    if (!ok) {
      throw new BadGatewayException(error || 'SMS provider rejected the request');
    }

    return {
      ok: true,
      toPhone: `88${localMobile}`,
      logId: log.id,
      message: 'SMS sent',
    };
  }
}

function toTemplateDto(row: {
  id: string;
  slug: string;
  label: string;
  message: string;
  enabled: boolean;
  sortOrder: number;
  updatedAt: Date;
}): SmsTemplate {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    message: row.message,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** BD local mobile without leading 0 / country code — e.g. 1722092671 */
export function normalizeBdLocalMobile(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('880')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length < 10 || digits.length > 11) return null;
  return digits;
}

export function renderMessageTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, value);
    out = out.replaceAll(`[${key}]`, value);
  }
  return out;
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url.slice(0, 48) + (url.length > 48 ? '…' : '');
  }
}

function maskParamsTemplate(params: string): string {
  return params
    .replace(/(api_token=)[^&]*/gi, '$1***')
    .replace(/(api_key=)[^&]*/gi, '$1***')
    .replace(/(password=)[^&]*/gi, '$1***')
    .replace(/(secret=)[^&]*/gi, '$1***');
}

function formatSmsNetworkError(error: unknown, apiUrl: string): string {
  const host = (() => {
    try {
      return new URL(apiUrl).host;
    } catch {
      return apiUrl;
    }
  })();

  const cause =
    error && typeof error === 'object' && 'cause' in error
      ? (error as { cause?: unknown }).cause
      : undefined;
  const causeMsg =
    cause instanceof Error
      ? cause.message
      : cause && typeof cause === 'object' && 'code' in cause
        ? String((cause as { code?: unknown }).code)
        : null;
  const code =
    cause && typeof cause === 'object' && 'code' in cause
      ? String((cause as { code?: unknown }).code ?? '')
      : '';

  if (code === 'UND_ERR_CONNECT_TIMEOUT' || /Connect Timeout/i.test(causeMsg ?? '')) {
    return (
      `Cannot reach SMS provider ${host} (connect timeout). ` +
      `Your server IP may be blocked or not whitelisted at the gateway — ask Gennet to allow your public IP, then retry.`
    );
  }
  if (code === 'ENOTFOUND' || /getaddrinfo/i.test(causeMsg ?? '')) {
    return `DNS lookup failed for ${host}. Check API URL.`;
  }
  if (code === 'ECONNREFUSED') {
    return `Connection refused by ${host}. Check API URL / firewall.`;
  }
  if (code === 'CERT_HAS_EXPIRED' || /certificate/i.test(causeMsg ?? '')) {
    return `TLS certificate error talking to ${host}.`;
  }

  const top = error instanceof Error ? error.message : 'SMS provider request failed';
  return causeMsg && causeMsg !== top ? `${top}: ${causeMsg}` : top;
}

/** Gennet / common gateways often return HTTP 200 with status ERROR in JSON body. */
function parseSmsProviderError(responseText: string): string | null {
  const trimmed = responseText.trim();
  if (!trimmed) return 'Empty response from SMS provider';
  try {
    const json = JSON.parse(trimmed) as Record<string, unknown>;
    const status = String(json['status'] ?? json['Status'] ?? '').toUpperCase();
    const statusCode = Number(json['status_code'] ?? json['statusCode'] ?? NaN);
    const errMsg = String(
      json['error_message'] ?? json['error'] ?? json['message'] ?? '',
    ).trim();

    if (status && !['SUCCESS', 'OK', 'SENT', 'ACCEPT', 'ACCEPTED'].includes(status)) {
      return errMsg || `Provider status: ${status}`;
    }
    if (Number.isFinite(statusCode) && statusCode >= 400) {
      return errMsg || `Provider status_code: ${statusCode}`;
    }
    if (json['success'] === false) {
      return errMsg || 'Provider reported failure';
    }
    return null;
  } catch {
    // Non-JSON success bodies (plain "OK", etc.)
    const upper = trimmed.toUpperCase();
    if (upper.includes('ERROR') || upper.includes('FAILED') || upper.includes('INVALID')) {
      return trimmed.slice(0, 300);
    }
    return null;
  }
}

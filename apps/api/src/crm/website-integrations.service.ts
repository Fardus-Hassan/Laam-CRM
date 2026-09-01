import { createHash, randomBytes } from 'crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  CreateWebsiteStorePayload,
  UpdateWebsiteIngestConfigPayload,
  UpdateWebsiteStorePayload,
  WebsiteIngestConfig,
  WebsiteStore as WebsiteStoreDto,
} from '@laam/types';
import {
  updateWebsiteIngestConfigPayloadSchema,
  websiteIngestConfigSchema,
} from '@laam/types';

import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret, encryptSecret } from './credentials-crypto.util';

export type StoredWebsiteSecrets = {
  wooConsumerKey?: string;
  wooConsumerSecret?: string;
  /** HMAC secret for X-WC-Webhook-Signature (WooCommerce webhook "Secret" field). */
  wooWebhookSecret?: string;
};

type OrgSettingsJson = {
  email?: string;
  address?: string;
  district?: string;
  website?: string;
  timezone?: string;
  currency?: string;
  orderPrefix?: string;
  defaultCourier?: string;
  websiteIngest?: WebsiteIngestConfig;
};

function asOrgSettings(value: unknown): OrgSettingsJson {
  if (!value || typeof value !== 'object') return {};
  return value as OrgSettingsJson;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateIngestToken(): string {
  return `laam_wh_${randomBytes(24).toString('base64url')}`;
}

function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex');
}

@Injectable()
export class WebsiteIntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) throw new BadRequestException('Organization required');
  }

  async list(organizationId: string): Promise<WebsiteStoreDto[]> {
    const rows = await this.prisma.websiteStore.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.toPublic(row));
  }

  async get(organizationId: string, id: string): Promise<WebsiteStoreDto> {
    const row = await this.prisma.websiteStore.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Website store not found');
    return this.toPublic(row);
  }

  async create(
    organizationId: string,
    payload: CreateWebsiteStorePayload,
  ): Promise<WebsiteStoreDto> {
    const slug = payload.slug.trim().toLowerCase();
    const existing = await this.prisma.websiteStore.findUnique({
      where: { organizationId_slug: { organizationId, slug } },
    });
    if (existing) throw new BadRequestException(`Slug "${slug}" already exists`);

    const ingestToken = generateIngestToken();
    const secrets: StoredWebsiteSecrets = {};
    if (payload.wooConsumerKey?.trim()) secrets.wooConsumerKey = payload.wooConsumerKey.trim();
    if (payload.wooConsumerSecret?.trim()) {
      secrets.wooConsumerSecret = payload.wooConsumerSecret.trim();
    }

    let revealedWebhookSecret: string | undefined;
    if (payload.platform === 'woocommerce') {
      revealedWebhookSecret =
        payload.wooWebhookSecret?.trim() || generateWebhookSecret();
      secrets.wooWebhookSecret = revealedWebhookSecret;
    } else if (payload.wooWebhookSecret?.trim()) {
      secrets.wooWebhookSecret = payload.wooWebhookSecret.trim();
      revealedWebhookSecret = secrets.wooWebhookSecret;
    }

    const row = await this.prisma.websiteStore.create({
      data: {
        organizationId,
        name: payload.name.trim(),
        slug,
        platform: payload.platform,
        enabled: payload.enabled ?? true,
        storeUrl: payload.storeUrl?.trim() || null,
        ingestTokenHash: hashToken(ingestToken),
        credentialsEnc:
          Object.keys(secrets).length > 0 ? encryptSecret(JSON.stringify(secrets)) : null,
      },
    });

    return this.toPublic(row, {
      ingestToken,
      wooWebhookSecret: revealedWebhookSecret,
    });
  }

  async update(
    organizationId: string,
    id: string,
    payload: UpdateWebsiteStorePayload,
  ): Promise<WebsiteStoreDto> {
    const row = await this.prisma.websiteStore.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Website store not found');

    const secrets = this.readSecrets(row.credentialsEnc);
    if (payload.wooConsumerKey !== undefined) {
      const next = payload.wooConsumerKey.trim();
      if (next) secrets.wooConsumerKey = next;
    }
    if (payload.wooConsumerSecret !== undefined) {
      const next = payload.wooConsumerSecret.trim();
      if (next) secrets.wooConsumerSecret = next;
    }
    let revealedWebhookSecret: string | undefined;
    if (payload.wooWebhookSecret !== undefined) {
      const next = payload.wooWebhookSecret.trim();
      if (next) {
        secrets.wooWebhookSecret = next;
        revealedWebhookSecret = next;
      }
    }

    const hasAnySecret =
      Boolean(secrets.wooConsumerKey) ||
      Boolean(secrets.wooConsumerSecret) ||
      Boolean(secrets.wooWebhookSecret);

    const updated = await this.prisma.websiteStore.update({
      where: { id },
      data: {
        name: payload.name?.trim() || undefined,
        enabled: payload.enabled,
        storeUrl:
          payload.storeUrl === undefined
            ? undefined
            : payload.storeUrl?.trim() || null,
        credentialsEnc: hasAnySecret
          ? encryptSecret(JSON.stringify(secrets))
          : row.credentialsEnc,
        lastError: null,
      },
    });

    return this.toPublic(updated, { wooWebhookSecret: revealedWebhookSecret });
  }

  async rotateToken(organizationId: string, id: string): Promise<WebsiteStoreDto> {
    const row = await this.prisma.websiteStore.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Website store not found');

    const ingestToken = generateIngestToken();
    const updated = await this.prisma.websiteStore.update({
      where: { id },
      data: { ingestTokenHash: hashToken(ingestToken), lastError: null },
    });
    return this.toPublic(updated, { ingestToken });
  }

  /** Rotate Woo webhook HMAC secret (show once). */
  async rotateWebhookSecret(
    organizationId: string,
    id: string,
  ): Promise<WebsiteStoreDto> {
    const row = await this.prisma.websiteStore.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Website store not found');
    if (row.platform !== 'woocommerce') {
      throw new BadRequestException('Webhook secret applies to WooCommerce stores only');
    }

    const secrets = this.readSecrets(row.credentialsEnc);
    const wooWebhookSecret = generateWebhookSecret();
    secrets.wooWebhookSecret = wooWebhookSecret;

    const updated = await this.prisma.websiteStore.update({
      where: { id },
      data: {
        credentialsEnc: encryptSecret(JSON.stringify(secrets)),
        lastError: null,
      },
    });
    return this.toPublic(updated, { wooWebhookSecret });
  }

  async disconnect(organizationId: string, id: string): Promise<{ ok: true }> {
    const row = await this.prisma.websiteStore.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Website store not found');
    await this.prisma.websiteStore.delete({ where: { id } });
    return { ok: true };
  }

  async resolveByIngestToken(token: string) {
    const raw = token.trim();
    if (!raw) throw new UnauthorizedException('Missing ingest token');
    const row = await this.prisma.websiteStore.findUnique({
      where: { ingestTokenHash: hashToken(raw) },
    });
    if (!row || !row.enabled) {
      throw new UnauthorizedException('Invalid or disabled ingest token');
    }
    return row;
  }

  getWebhookSecret(credentialsEnc: string | null | undefined): string | undefined {
    return this.readSecrets(credentialsEnc ?? null).wooWebhookSecret?.trim() || undefined;
  }

  async markIngestSuccess(storeId: string) {
    await this.prisma.websiteStore.update({
      where: { id: storeId },
      data: { lastIngestAt: new Date(), lastError: null },
    });
  }

  async markIngestError(storeId: string, message: string) {
    await this.prisma.websiteStore.update({
      where: { id: storeId },
      data: { lastError: message.slice(0, 500) },
    });
  }

  async getIngestConfig(organizationId: string): Promise<WebsiteIngestConfig> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const stored = asOrgSettings(org?.settings).websiteIngest;
    return websiteIngestConfigSchema.parse(stored ?? {});
  }

  async updateIngestConfig(
    organizationId: string,
    payload: UpdateWebsiteIngestConfigPayload,
  ): Promise<WebsiteIngestConfig> {
    const patch = updateWebsiteIngestConfigPayloadSchema.parse(payload);
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const current = asOrgSettings(org.settings);
    const nextIngest = websiteIngestConfigSchema.parse({
      ...current.websiteIngest,
      ...patch,
    });
    const minutes =
      nextIngest.duplicateMatchWindowUnit === 'hours'
        ? nextIngest.duplicateMatchWindowValue * 60
        : nextIngest.duplicateMatchWindowValue;
    if (minutes < 1 || minutes > 10_080) {
      throw new BadRequestException(
        'Duplicate match window must be between 1 minute and 7 days (10080 minutes)',
      );
    }

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...current,
          websiteIngest: nextIngest,
        } as object,
      },
    });
    return nextIngest;
  }

  private readSecrets(credentialsEnc: string | null): StoredWebsiteSecrets {
    if (!credentialsEnc) return {};
    try {
      return JSON.parse(decryptSecret(credentialsEnc)) as StoredWebsiteSecrets;
    } catch {
      return {};
    }
  }

  private toPublic(
    row: {
      id: string;
      name: string;
      slug: string;
      platform: string;
      enabled: boolean;
      storeUrl: string | null;
      credentialsEnc: string | null;
      lastIngestAt: Date | null;
      lastError: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    reveal?: { ingestToken?: string; wooWebhookSecret?: string },
  ): WebsiteStoreDto {
    const secrets = this.readSecrets(row.credentialsEnc);
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      platform: row.platform as WebsiteStoreDto['platform'],
      enabled: row.enabled,
      storeUrl: row.storeUrl,
      hasIngestToken: true,
      ...(reveal?.ingestToken ? { ingestToken: reveal.ingestToken } : {}),
      hasWooCredentials: Boolean(secrets.wooConsumerKey && secrets.wooConsumerSecret),
      hasWooWebhookSecret: Boolean(secrets.wooWebhookSecret),
      ...(reveal?.wooWebhookSecret
        ? { wooWebhookSecret: reveal.wooWebhookSecret }
        : {}),
      lastIngestAt: row.lastIngestAt?.toISOString() ?? null,
      lastError: row.lastError,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

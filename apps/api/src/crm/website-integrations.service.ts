import { createHash, randomBytes } from 'crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  CreateWebsiteStorePayload,
  UpdateWebsiteStorePayload,
  WebsiteStore as WebsiteStoreDto,
} from '@laam/types';

import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret, encryptSecret } from './credentials-crypto.util';

type StoredWebsiteSecrets = {
  wooConsumerKey?: string;
  wooConsumerSecret?: string;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateIngestToken(): string {
  return `laam_wh_${randomBytes(24).toString('base64url')}`;
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

    return this.toPublic(row, ingestToken);
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

    const updated = await this.prisma.websiteStore.update({
      where: { id },
      data: {
        name: payload.name?.trim() || undefined,
        enabled: payload.enabled,
        storeUrl:
          payload.storeUrl === undefined
            ? undefined
            : payload.storeUrl?.trim() || null,
        credentialsEnc:
          secrets.wooConsumerKey || secrets.wooConsumerSecret
            ? encryptSecret(JSON.stringify(secrets))
            : row.credentialsEnc,
        lastError: null,
      },
    });

    return this.toPublic(updated);
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
    return this.toPublic(updated, ingestToken);
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
    ingestToken?: string,
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
      ...(ingestToken ? { ingestToken } : {}),
      hasWooCredentials: Boolean(secrets.wooConsumerKey && secrets.wooConsumerSecret),
      lastIngestAt: row.lastIngestAt?.toISOString() ?? null,
      lastError: row.lastError,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

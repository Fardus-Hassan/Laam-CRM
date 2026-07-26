import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret, encryptSecret } from './credentials-crypto.util';
import {
  normalizePathaoStatusSlug,
  PATHAO_STATUS_SEEDS,
} from './pathao-status.defaults';

export type PathaoAuthCredentials = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  grantType: string;
  environment: 'sandbox' | 'live';
};

export type PathaoCredentials = PathaoAuthCredentials & {
  storeId: number;
};

export type PathaoIntegrationPublic = {
  provider: 'pathao';
  enabled: boolean;
  environment: 'sandbox' | 'live';
  storeId: string | null;
  hasCredentials: boolean;
  clientIdMasked: string | null;
  usernameMasked: string | null;
  syncIntervalSec: number;
  lastSyncAt: string | null;
  lastError: string | null;
  updatedAt: string;
};

export type CourierStatusMapDto = {
  id: string;
  provider: string;
  slug: string;
  label: string;
  crmStatus: string | null;
  isTerminal: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type UpsertPathaoIntegrationInput = {
  enabled?: boolean;
  environment?: 'sandbox' | 'live';
  storeId?: string | null;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  baseUrl?: string;
  syncIntervalSec?: number;
};

type StoredPathaoSecrets = {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  baseUrl?: string;
};

@Injectable()
export class CourierIntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPathaoPublic(organizationId: string): Promise<PathaoIntegrationPublic> {
    const row = await this.prisma.courierIntegration.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: 'pathao' },
      },
    });
    if (!row) {
      return {
        provider: 'pathao',
        enabled: false,
        environment: 'sandbox',
        storeId: null,
        hasCredentials: false,
        clientIdMasked: null,
        usernameMasked: null,
        syncIntervalSec: 180,
        lastSyncAt: null,
        lastError: null,
        updatedAt: new Date(0).toISOString(),
      };
    }
    let secrets: StoredPathaoSecrets | null = null;
    if (row.credentialsEnc) {
      try {
        secrets = JSON.parse(decryptSecret(row.credentialsEnc)) as StoredPathaoSecrets;
      } catch {
        secrets = null;
      }
    }
    return {
      provider: 'pathao',
      enabled: row.enabled,
      environment: row.environment === 'live' ? 'live' : 'sandbox',
      storeId: row.storeId,
      hasCredentials: Boolean(secrets?.clientId && secrets?.clientSecret && secrets?.username && secrets?.password),
      clientIdMasked: secrets?.clientId ? maskSecret(secrets.clientId) : null,
      usernameMasked: secrets?.username ? maskSecret(secrets.username) : null,
      syncIntervalSec: row.syncIntervalSec || 180,
      lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
      lastError: row.lastError,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async upsertPathao(
    organizationId: string,
    input: UpsertPathaoIntegrationInput,
  ): Promise<PathaoIntegrationPublic> {
    const existing = await this.prisma.courierIntegration.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: 'pathao' },
      },
    });

    let secrets: StoredPathaoSecrets | null = null;
    if (existing?.credentialsEnc) {
      try {
        secrets = JSON.parse(decryptSecret(existing.credentialsEnc)) as StoredPathaoSecrets;
      } catch {
        secrets = null;
      }
    }

    const nextSecrets: StoredPathaoSecrets = {
      clientId: input.clientId?.trim() || secrets?.clientId || '',
      clientSecret: input.clientSecret?.trim() || secrets?.clientSecret || '',
      username: input.username?.trim() || secrets?.username || '',
      password: input.password?.trim() || secrets?.password || '',
      baseUrl: input.baseUrl?.trim() || secrets?.baseUrl,
    };

    if (
      input.enabled !== false &&
      (input.clientId || input.clientSecret || input.username || input.password || !existing)
    ) {
      if (!nextSecrets.clientId || !nextSecrets.clientSecret || !nextSecrets.username || !nextSecrets.password) {
        throw new BadRequestException(
          'Pathao requires clientId, clientSecret, username, and password',
        );
      }
    }

    const environment =
      input.environment ??
      (existing?.environment === 'live' ? 'live' : 'sandbox');

    const syncIntervalSec = Math.max(
      60,
      Math.min(3600, input.syncIntervalSec ?? existing?.syncIntervalSec ?? 180),
    );

    await this.prisma.courierIntegration.upsert({
      where: {
        organizationId_provider: { organizationId, provider: 'pathao' },
      },
      create: {
        organizationId,
        provider: 'pathao',
        enabled: input.enabled ?? false,
        environment,
        storeId: input.storeId === undefined ? null : input.storeId,
        credentialsEnc:
          nextSecrets.clientId && nextSecrets.password
            ? encryptSecret(JSON.stringify(nextSecrets))
            : null,
        syncIntervalSec,
        lastError: null,
      },
      update: {
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        environment,
        ...(input.storeId !== undefined ? { storeId: input.storeId } : {}),
        ...(nextSecrets.clientId
          ? { credentialsEnc: encryptSecret(JSON.stringify(nextSecrets)) }
          : {}),
        syncIntervalSec,
        lastError: null,
      },
    });

    await this.ensurePathaoStatusMaps(organizationId);
    return this.getPathaoPublic(organizationId);
  }

  async disconnectPathao(organizationId: string): Promise<PathaoIntegrationPublic> {
    const existing = await this.prisma.courierIntegration.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: 'pathao' },
      },
    });
    if (!existing) {
      return this.getPathaoPublic(organizationId);
    }
    await this.prisma.courierIntegration.update({
      where: { id: existing.id },
      data: {
        enabled: false,
        credentialsEnc: null,
        storeId: null,
        lastError: null,
      },
    });
    return this.getPathaoPublic(organizationId);
  }

  /**
   * Auth credentials only (no store required) — for cities/stores/test.
   */
  async resolvePathaoAuth(organizationId: string): Promise<PathaoAuthCredentials> {
    const row = await this.prisma.courierIntegration.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: 'pathao' },
      },
    });

    if (row?.credentialsEnc) {
      if (!row.enabled) {
        throw new ServiceUnavailableException(
          'Pathao is saved but not enabled. Open Settings → Integrations → Pathao, turn on Enable Pathao, then Save.',
        );
      }
      let secrets: StoredPathaoSecrets;
      try {
        secrets = JSON.parse(decryptSecret(row.credentialsEnc)) as StoredPathaoSecrets;
      } catch {
        throw new ServiceUnavailableException(
          'Pathao credentials are corrupt. Re-save them in Settings → Integrations → Pathao.',
        );
      }
      if (!secrets.clientId || !secrets.clientSecret || !secrets.username || !secrets.password) {
        throw new ServiceUnavailableException(
          'Pathao credentials incomplete. Configure in Settings → Integrations → Pathao.',
        );
      }
      const environment = row.environment === 'live' ? 'live' : 'sandbox';
      return {
        baseUrl: (
          secrets.baseUrl ||
          (environment === 'live'
            ? 'https://api-hermes.pathao.com'
            : 'https://courier-api-sandbox.pathao.com')
        ).replace(/\/$/, ''),
        clientId: secrets.clientId,
        clientSecret: secrets.clientSecret,
        username: secrets.username,
        password: secrets.password,
        grantType: 'password',
        environment,
      };
    }

    if (!row) {
      const boot = tryEnvPathaoBootstrap();
      if (boot) {
        const { storeId: _storeId, ...auth } = boot;
        return auth;
      }
    }

    throw new ServiceUnavailableException(
      'Pathao is not configured for this organization. Go to Settings → Integrations → Pathao.',
    );
  }

  /**
   * Full credentials including store — for booking / order APIs.
   */
  async resolvePathaoCredentials(organizationId: string): Promise<PathaoCredentials> {
    const auth = await this.resolvePathaoAuth(organizationId);
    const row = await this.prisma.courierIntegration.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: 'pathao' },
      },
    });

    const storeId = Number(row?.storeId);
    if (Number.isFinite(storeId) && storeId > 0) {
      return { ...auth, storeId: Math.floor(storeId) };
    }

    const boot = !row ? tryEnvPathaoBootstrap() : null;
    if (boot?.storeId) {
      return { ...auth, storeId: boot.storeId };
    }

    throw new ServiceUnavailableException(
      'Pathao store is not selected. Click Test connection, choose a Store, then Save.',
    );
  }

  async markSyncResult(
    organizationId: string,
    result: { ok: boolean; error?: string },
  ): Promise<void> {
    await this.prisma.courierIntegration.updateMany({
      where: { organizationId, provider: 'pathao' },
      data: {
        lastSyncAt: new Date(),
        lastError: result.ok ? null : (result.error ?? 'Sync failed').slice(0, 500),
      },
    });
  }

  async listEnabledPathaoOrgs(): Promise<
    Array<{ organizationId: string; syncIntervalSec: number }>
  > {
    const rows = await this.prisma.courierIntegration.findMany({
      where: { provider: 'pathao', enabled: true, credentialsEnc: { not: null } },
      select: { organizationId: true, syncIntervalSec: true },
    });
    return rows.map((r) => ({
      organizationId: r.organizationId,
      syncIntervalSec: r.syncIntervalSec || 180,
    }));
  }

  async ensurePathaoStatusMaps(organizationId: string): Promise<void> {
    const count = await this.prisma.courierStatusMap.count({
      where: { organizationId, provider: 'pathao' },
    });
    if (count > 0) return;
    await this.prisma.courierStatusMap.createMany({
      data: PATHAO_STATUS_SEEDS.map((s) => ({
        organizationId,
        provider: 'pathao',
        slug: s.slug,
        label: s.label,
        crmStatus: s.crmStatus,
        isTerminal: s.isTerminal,
        sortOrder: s.sortOrder,
        isActive: true,
      })),
    });
  }

  async listStatusMaps(
    organizationId: string,
    provider = 'pathao',
  ): Promise<CourierStatusMapDto[]> {
    await this.ensurePathaoStatusMaps(organizationId);
    const rows = await this.prisma.courierStatusMap.findMany({
      where: { organizationId, provider },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      provider: r.provider,
      slug: r.slug,
      label: r.label,
      crmStatus: r.crmStatus,
      isTerminal: r.isTerminal,
      sortOrder: r.sortOrder,
      isActive: r.isActive,
    }));
  }

  async upsertStatusMap(
    organizationId: string,
    input: {
      id?: string;
      provider?: string;
      slug: string;
      label: string;
      crmStatus?: string | null;
      isTerminal?: boolean;
      sortOrder?: number;
      isActive?: boolean;
    },
  ): Promise<CourierStatusMapDto> {
    const provider = input.provider ?? 'pathao';
    const slug = normalizePathaoStatusSlug(input.slug);
    if (!input.label.trim()) throw new BadRequestException('label is required');

    const row = input.id
      ? await this.prisma.courierStatusMap.update({
          where: { id: input.id },
          data: {
            slug,
            label: input.label.trim(),
            crmStatus: input.crmStatus === undefined ? undefined : input.crmStatus,
            isTerminal: input.isTerminal,
            sortOrder: input.sortOrder,
            isActive: input.isActive,
          },
        })
      : await this.prisma.courierStatusMap.upsert({
          where: {
            organizationId_provider_slug: { organizationId, provider, slug },
          },
          create: {
            organizationId,
            provider,
            slug,
            label: input.label.trim(),
            crmStatus: input.crmStatus ?? null,
            isTerminal: Boolean(input.isTerminal),
            sortOrder: input.sortOrder ?? 999,
            isActive: input.isActive ?? true,
          },
          update: {
            label: input.label.trim(),
            crmStatus: input.crmStatus === undefined ? undefined : input.crmStatus,
            isTerminal: input.isTerminal,
            sortOrder: input.sortOrder,
            isActive: input.isActive,
          },
        });

    if (row.organizationId !== organizationId) {
      throw new NotFoundException('Status map not found');
    }

    return {
      id: row.id,
      provider: row.provider,
      slug: row.slug,
      label: row.label,
      crmStatus: row.crmStatus,
      isTerminal: row.isTerminal,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    };
  }

  async resolveStatusMapping(
    organizationId: string,
    provider: string,
    rawStatus: string,
  ): Promise<{ slug: string; label: string; crmStatus: string | null; isTerminal: boolean }> {
    await this.ensurePathaoStatusMaps(organizationId);
    const slug = normalizePathaoStatusSlug(rawStatus);
    const row = await this.prisma.courierStatusMap.findUnique({
      where: {
        organizationId_provider_slug: { organizationId, provider, slug },
      },
    });
    if (row) {
      return {
        slug: row.slug,
        label: row.label,
        crmStatus: row.crmStatus,
        isTerminal: row.isTerminal,
      };
    }
    const seed = PATHAO_STATUS_SEEDS.find((s) => s.slug === slug);
    return {
      slug,
      label: seed?.label ?? `Pathao - ${rawStatus}`,
      crmStatus: seed?.crmStatus ?? 'in_courier',
      isTerminal: seed?.isTerminal ?? false,
    };
  }
}

function maskSecret(value: string): string {
  if (value.length <= 4) return '••••';
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}

function tryEnvPathaoBootstrap(): PathaoCredentials | null {
  const env = (process.env['PATHAO_ENV'] ?? 'sandbox').toLowerCase();
  const isLive = env === 'live' || env === 'production';
  const baseUrl = (
    isLive
      ? process.env['PATHAO_LIVE_BASE_URL']
      : process.env['PATHAO_SANDBOX_BASE_URL']
  )?.replace(/\/$/, '');
  const clientId = isLive
    ? process.env['PATHAO_LIVE_CLIENT_ID']
    : process.env['PATHAO_SANDBOX_CLIENT_ID'];
  const clientSecret = isLive
    ? process.env['PATHAO_LIVE_CLIENT_SECRET']
    : process.env['PATHAO_SANDBOX_CLIENT_SECRET'];
  const username = isLive
    ? process.env['PATHAO_LIVE_USERNAME'] || process.env['PATHAO_SANDBOX_USERNAME']
    : process.env['PATHAO_SANDBOX_USERNAME'];
  const password = isLive
    ? process.env['PATHAO_LIVE_PASSWORD'] || process.env['PATHAO_SANDBOX_PASSWORD']
    : process.env['PATHAO_SANDBOX_PASSWORD'];
  const storeId = Number(
    isLive
      ? process.env['PATHAO_LIVE_STORE_ID'] || process.env['PATHAO_STORE_ID']
      : process.env['PATHAO_SANDBOX_STORE_ID'] || process.env['PATHAO_STORE_ID'],
  );
  if (!baseUrl || !clientId || !clientSecret || !username || !password) return null;
  if (!Number.isFinite(storeId) || storeId <= 0) return null;
  return {
    baseUrl,
    clientId,
    clientSecret,
    username,
    password,
    grantType: process.env['PATHAO_SANDBOX_GRANT_TYPE'] ?? 'password',
    storeId: Math.floor(storeId),
    environment: isLive ? 'live' : 'sandbox',
  };
}

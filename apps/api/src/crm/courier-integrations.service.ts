import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import {
  CARRYBEE_STATUS_SEEDS,
  normalizeCarrybeeStatusSlug,
} from './carrybee-status.defaults';
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

export type CarrybeeAuthCredentials = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  clientContext: string;
  environment: 'sandbox' | 'live';
};

export type CarrybeeCredentials = CarrybeeAuthCredentials & {
  storeId: string;
};

export type CarrybeeIntegrationPublic = {
  provider: 'carrybee';
  enabled: boolean;
  environment: 'sandbox' | 'live';
  storeId: string | null;
  hasCredentials: boolean;
  clientIdMasked: string | null;
  clientContextMasked: string | null;
  syncIntervalSec: number;
  lastSyncAt: string | null;
  lastError: string | null;
  updatedAt: string;
};

export type UpsertCarrybeeIntegrationInput = {
  enabled?: boolean;
  environment?: 'sandbox' | 'live';
  storeId?: string | null;
  clientId?: string;
  clientSecret?: string;
  clientContext?: string;
  baseUrl?: string;
  syncIntervalSec?: number;
};

type StoredCarrybeeSecrets = {
  clientId: string;
  clientSecret: string;
  clientContext: string;
  baseUrl?: string;
};

export type BdCourierIntegrationPublic = {
  provider: 'bdcourier';
  enabled: boolean;
  hasCredentials: boolean;
  apiKeyMasked: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  updatedAt: string;
};

export type UpsertBdCourierIntegrationInput = {
  enabled?: boolean;
  apiKey?: string;
};

type StoredBdCourierSecrets = {
  apiKey: string;
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

  async getBdCourierPublic(organizationId: string): Promise<BdCourierIntegrationPublic> {
    const row = await this.prisma.courierIntegration.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: 'bdcourier' },
      },
    });
    if (!row) {
      return {
        provider: 'bdcourier',
        enabled: false,
        hasCredentials: false,
        apiKeyMasked: null,
        lastSyncAt: null,
        lastError: null,
        updatedAt: new Date(0).toISOString(),
      };
    }
    let secrets: StoredBdCourierSecrets | null = null;
    if (row.credentialsEnc) {
      try {
        secrets = JSON.parse(decryptSecret(row.credentialsEnc)) as StoredBdCourierSecrets;
      } catch {
        secrets = null;
      }
    }
    return {
      provider: 'bdcourier',
      enabled: row.enabled,
      hasCredentials: Boolean(secrets?.apiKey),
      apiKeyMasked: secrets?.apiKey ? maskSecret(secrets.apiKey) : null,
      lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
      lastError: row.lastError,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async upsertBdCourier(
    organizationId: string,
    input: UpsertBdCourierIntegrationInput,
  ): Promise<BdCourierIntegrationPublic> {
    const existing = await this.prisma.courierIntegration.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: 'bdcourier' },
      },
    });

    let secrets: StoredBdCourierSecrets | null = null;
    if (existing?.credentialsEnc) {
      try {
        secrets = JSON.parse(decryptSecret(existing.credentialsEnc)) as StoredBdCourierSecrets;
      } catch {
        secrets = null;
      }
    }

    const nextKey = input.apiKey?.trim() || secrets?.apiKey || '';
    if (input.enabled !== false && (input.apiKey || !existing) && !nextKey) {
      throw new BadRequestException('BD Courier API key is required');
    }

    await this.prisma.courierIntegration.upsert({
      where: {
        organizationId_provider: { organizationId, provider: 'bdcourier' },
      },
      create: {
        organizationId,
        provider: 'bdcourier',
        enabled: input.enabled ?? Boolean(nextKey),
        environment: 'live',
        credentialsEnc: nextKey ? encryptSecret(JSON.stringify({ apiKey: nextKey })) : null,
        lastError: null,
      },
      update: {
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(nextKey
          ? { credentialsEnc: encryptSecret(JSON.stringify({ apiKey: nextKey })) }
          : {}),
        lastError: null,
      },
    });

    return this.getBdCourierPublic(organizationId);
  }

  async disconnectBdCourier(organizationId: string): Promise<BdCourierIntegrationPublic> {
    const existing = await this.prisma.courierIntegration.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: 'bdcourier' },
      },
    });
    if (!existing) {
      return this.getBdCourierPublic(organizationId);
    }
    await this.prisma.courierIntegration.update({
      where: { id: existing.id },
      data: {
        enabled: false,
        credentialsEnc: null,
        lastError: null,
      },
    });
    return this.getBdCourierPublic(organizationId);
  }

  async resolveBdCourierApiKey(organizationId: string): Promise<string | null> {
    const row = await this.prisma.courierIntegration.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: 'bdcourier' },
      },
    });
    if (!row?.enabled || !row.credentialsEnc) return null;
    try {
      const secrets = JSON.parse(decryptSecret(row.credentialsEnc)) as StoredBdCourierSecrets;
      return secrets.apiKey?.trim() || null;
    } catch {
      return null;
    }
  }

  async setBdCourierLastError(organizationId: string, lastError: string | null): Promise<void> {
    const existing = await this.prisma.courierIntegration.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: 'bdcourier' },
      },
    });
    if (!existing) return;
    await this.prisma.courierIntegration.update({
      where: { id: existing.id },
      data: {
        lastError,
        ...(lastError === null ? { lastSyncAt: new Date() } : {}),
      },
    });
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

  async getCarrybeePublic(organizationId: string): Promise<CarrybeeIntegrationPublic> {
    const row = await this.prisma.courierIntegration.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: 'carrybee' },
      },
    });
    if (!row) {
      return {
        provider: 'carrybee',
        enabled: false,
        environment: 'sandbox',
        storeId: null,
        hasCredentials: false,
        clientIdMasked: null,
        clientContextMasked: null,
        syncIntervalSec: 180,
        lastSyncAt: null,
        lastError: null,
        updatedAt: new Date(0).toISOString(),
      };
    }
    let secrets: StoredCarrybeeSecrets | null = null;
    if (row.credentialsEnc) {
      try {
        secrets = JSON.parse(decryptSecret(row.credentialsEnc)) as StoredCarrybeeSecrets;
      } catch {
        secrets = null;
      }
    }
    return {
      provider: 'carrybee',
      enabled: row.enabled,
      environment: row.environment === 'live' ? 'live' : 'sandbox',
      storeId: row.storeId,
      hasCredentials: Boolean(
        secrets?.clientId && secrets?.clientSecret && secrets?.clientContext,
      ),
      clientIdMasked: secrets?.clientId ? maskSecret(secrets.clientId) : null,
      clientContextMasked: secrets?.clientContext
        ? maskSecret(secrets.clientContext)
        : null,
      syncIntervalSec: row.syncIntervalSec || 180,
      lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
      lastError: row.lastError,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async upsertCarrybee(
    organizationId: string,
    input: UpsertCarrybeeIntegrationInput,
  ): Promise<CarrybeeIntegrationPublic> {
    const existing = await this.prisma.courierIntegration.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: 'carrybee' },
      },
    });

    let secrets: StoredCarrybeeSecrets | null = null;
    if (existing?.credentialsEnc) {
      try {
        secrets = JSON.parse(decryptSecret(existing.credentialsEnc)) as StoredCarrybeeSecrets;
      } catch {
        secrets = null;
      }
    }

    const nextSecrets: StoredCarrybeeSecrets = {
      clientId: input.clientId?.trim() || secrets?.clientId || '',
      clientSecret: input.clientSecret?.trim() || secrets?.clientSecret || '',
      clientContext: input.clientContext?.trim() || secrets?.clientContext || '',
      baseUrl: input.baseUrl?.trim() || secrets?.baseUrl,
    };

    if (
      input.enabled !== false &&
      (input.clientId || input.clientSecret || input.clientContext || !existing)
    ) {
      if (!nextSecrets.clientId || !nextSecrets.clientSecret || !nextSecrets.clientContext) {
        throw new BadRequestException(
          'Carrybee requires clientId, clientSecret, and clientContext',
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
        organizationId_provider: { organizationId, provider: 'carrybee' },
      },
      create: {
        organizationId,
        provider: 'carrybee',
        enabled: input.enabled ?? false,
        environment,
        storeId: input.storeId === undefined ? null : input.storeId,
        credentialsEnc:
          nextSecrets.clientId && nextSecrets.clientSecret
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

    await this.ensureCarrybeeStatusMaps(organizationId);
    return this.getCarrybeePublic(organizationId);
  }

  async disconnectCarrybee(organizationId: string): Promise<CarrybeeIntegrationPublic> {
    const existing = await this.prisma.courierIntegration.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: 'carrybee' },
      },
    });
    if (!existing) {
      return this.getCarrybeePublic(organizationId);
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
    return this.getCarrybeePublic(organizationId);
  }

  /**
   * Auth credentials only (no store required) — for cities/zones/areas/test.
   */
  async resolveCarrybeeAuth(organizationId: string): Promise<CarrybeeAuthCredentials> {
    const row = await this.prisma.courierIntegration.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: 'carrybee' },
      },
    });

    if (row?.credentialsEnc) {
      if (!row.enabled) {
        throw new ServiceUnavailableException(
          'Carrybee is saved but not enabled. Open Settings → Integrations → Carrybee, turn on Enable Carrybee, then Save.',
        );
      }
      let secrets: StoredCarrybeeSecrets;
      try {
        secrets = JSON.parse(decryptSecret(row.credentialsEnc)) as StoredCarrybeeSecrets;
      } catch {
        throw new ServiceUnavailableException(
          'Carrybee credentials are corrupt. Re-save them in Settings → Integrations → Carrybee.',
        );
      }
      if (!secrets.clientId || !secrets.clientSecret || !secrets.clientContext) {
        throw new ServiceUnavailableException(
          'Carrybee credentials incomplete. Configure in Settings → Integrations → Carrybee.',
        );
      }
      const environment = row.environment === 'live' ? 'live' : 'sandbox';
      return {
        baseUrl: (
          secrets.baseUrl ||
          (environment === 'live'
            ? 'https://developers.carrybee.com'
            : 'https://sandbox.carrybee.com')
        ).replace(/\/$/, ''),
        clientId: secrets.clientId,
        clientSecret: secrets.clientSecret,
        clientContext: secrets.clientContext,
        environment,
      };
    }

    if (!row) {
      const boot = tryEnvCarrybeeBootstrap();
      if (boot) {
        const { storeId: _storeId, ...auth } = boot;
        return auth;
      }
    }

    throw new ServiceUnavailableException(
      'Carrybee is not configured for this organization. Go to Settings → Integrations → Carrybee.',
    );
  }

  /**
   * Full credentials including store — for booking / order APIs.
   */
  async resolveCarrybeeCredentials(organizationId: string): Promise<CarrybeeCredentials> {
    const auth = await this.resolveCarrybeeAuth(organizationId);
    const row = await this.prisma.courierIntegration.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: 'carrybee' },
      },
    });

    const storeId = row?.storeId?.trim();
    if (storeId) {
      return { ...auth, storeId };
    }

    const boot = !row ? tryEnvCarrybeeBootstrap() : null;
    if (boot?.storeId) {
      return { ...auth, storeId: boot.storeId };
    }

    throw new ServiceUnavailableException(
      'Carrybee store is not selected. Click Test connection, choose a Store, then Save.',
    );
  }

  async markCarrybeeSyncResult(
    organizationId: string,
    result: { ok: boolean; error?: string },
  ): Promise<void> {
    await this.prisma.courierIntegration.updateMany({
      where: { organizationId, provider: 'carrybee' },
      data: {
        lastSyncAt: new Date(),
        lastError: result.ok ? null : (result.error ?? 'Sync failed').slice(0, 500),
      },
    });
  }

  async listEnabledCarrybeeOrgs(): Promise<
    Array<{ organizationId: string; syncIntervalSec: number }>
  > {
    const rows = await this.prisma.courierIntegration.findMany({
      where: { provider: 'carrybee', enabled: true, credentialsEnc: { not: null } },
      select: { organizationId: true, syncIntervalSec: true },
    });
    return rows.map((r) => ({
      organizationId: r.organizationId,
      syncIntervalSec: r.syncIntervalSec || 180,
    }));
  }

  async ensureCarrybeeStatusMaps(organizationId: string): Promise<void> {
    const existing = await this.prisma.courierStatusMap.findMany({
      where: { organizationId, provider: 'carrybee' },
      select: { slug: true },
    });
    const have = new Set(existing.map((r) => r.slug));
    const missing = CARRYBEE_STATUS_SEEDS.filter((s) => !have.has(s.slug));
    if (missing.length === 0) return;
    await this.prisma.courierStatusMap.createMany({
      data: missing.map((s) => ({
        organizationId,
        provider: 'carrybee',
        slug: s.slug,
        label: s.label,
        crmStatus: s.crmStatus,
        isTerminal: s.isTerminal,
        sortOrder: s.sortOrder,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }

  async ensurePathaoStatusMaps(organizationId: string): Promise<void> {
    const existing = await this.prisma.courierStatusMap.findMany({
      where: { organizationId, provider: 'pathao' },
      select: { slug: true },
    });
    const have = new Set(existing.map((r) => r.slug));
    const missing = PATHAO_STATUS_SEEDS.filter((s) => !have.has(s.slug));
    if (missing.length === 0) return;
    await this.prisma.courierStatusMap.createMany({
      data: missing.map((s) => ({
        organizationId,
        provider: 'pathao',
        slug: s.slug,
        label: s.label,
        crmStatus: s.crmStatus,
        isTerminal: s.isTerminal,
        sortOrder: s.sortOrder,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }

  async listStatusMaps(
    organizationId: string,
    provider = 'pathao',
  ): Promise<CourierStatusMapDto[]> {
    if (provider === 'carrybee') {
      await this.ensureCarrybeeStatusMaps(organizationId);
    } else {
      await this.ensurePathaoStatusMaps(organizationId);
    }
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
    const slug =
      provider === 'carrybee'
        ? normalizeCarrybeeStatusSlug(input.slug)
        : normalizePathaoStatusSlug(input.slug);
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
    const isCarrybee = provider === 'carrybee';
    if (isCarrybee) {
      await this.ensureCarrybeeStatusMaps(organizationId);
    } else {
      await this.ensurePathaoStatusMaps(organizationId);
    }
    const slug = isCarrybee
      ? normalizeCarrybeeStatusSlug(rawStatus)
      : normalizePathaoStatusSlug(rawStatus);
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
    const seed = isCarrybee
      ? CARRYBEE_STATUS_SEEDS.find((s) => s.slug === slug)
      : PATHAO_STATUS_SEEDS.find((s) => s.slug === slug);
    return {
      slug,
      label: seed?.label ?? `${isCarrybee ? 'Carrybee' : 'Pathao'} - ${rawStatus}`,
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

function tryEnvCarrybeeBootstrap(): CarrybeeCredentials | null {
  const env = (process.env['CARRYBEE_ENV'] ?? 'sandbox').toLowerCase();
  const isLive = env === 'live' || env === 'production';
  const baseUrl = (
    isLive
      ? process.env['CARRYBEE_LIVE_BASE_URL']
      : process.env['CARRYBEE_SANDBOX_BASE_URL']
  )?.replace(/\/$/, '');
  const clientId = isLive
    ? process.env['CARRYBEE_LIVE_CLIENT_ID']
    : process.env['CARRYBEE_SANDBOX_CLIENT_ID'];
  const clientSecret = isLive
    ? process.env['CARRYBEE_LIVE_CLIENT_SECRET']
    : process.env['CARRYBEE_SANDBOX_CLIENT_SECRET'];
  const clientContext = isLive
    ? process.env['CARRYBEE_LIVE_CLIENT_CONTEXT']
    : process.env['CARRYBEE_SANDBOX_CLIENT_CONTEXT'];
  const storeId = (
    isLive
      ? process.env['CARRYBEE_LIVE_STORE_ID'] || process.env['CARRYBEE_STORE_ID']
      : process.env['CARRYBEE_SANDBOX_STORE_ID']
  )?.trim();
  if (!baseUrl || !clientId || !clientSecret || !clientContext) return null;
  if (!storeId) return null;
  return {
    baseUrl,
    clientId,
    clientSecret,
    clientContext,
    storeId,
    environment: isLive ? 'live' : 'sandbox',
  };
}

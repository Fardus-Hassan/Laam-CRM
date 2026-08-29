import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type {
  CourierFraudReport,
  CourierPhoneHistory,
  CourierProviderHistory,
  CourierRiskVerdict,
  OrderCourierStats,
} from '@laam/types';

import { BdCourierService } from './bdcourier.service';
import { PrismaService } from '../prisma/prisma.service';
import { CourierIntegrationsService } from './courier-integrations.service';
import { PathaoCourierService } from './pathao-courier.service';
import { normalizeBdPhone } from './phone.util';

const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48h fresh window (production default)
const ERROR_CACHE_TTL_MS = 30 * 60 * 1000; // 30m when no usable counts

type LiveHistory = {
  aggregate: OrderCourierStats;
  providers: CourierProviderHistory[];
  riskVerdict?: CourierRiskVerdict;
  reports?: CourierFraudReport[];
  fetchedAt: string;
};

function emptyStats(): OrderCourierStats {
  return { to: 0, co: 0, su: 0, fa: 0, label: 'New', percent: 0 };
}

function statsFromCounts(success: number, failed: number, total?: number): OrderCourierStats {
  const su = Math.max(0, success);
  const fa = Math.max(0, failed);
  const to = total !== undefined ? Math.max(0, total) : su + fa;
  const co = Math.max(0, to - su - fa);
  const decided = su + fa;
  const percent = decided > 0 ? Math.round((su / decided) * 1000) / 10 : to > 0 ? 100 : 0;

  let label = 'New';
  if (to >= 10) label = 'Frequent';
  else if (to >= 2) label = 'Regular';
  if (decided >= 3 && percent < 50) label = 'Risky';

  return { to, co, su, fa, label, percent: Math.min(100, Math.max(0, percent)) };
}

function riskFromPathaoRating(rating?: string): CourierProviderHistory['riskLevel'] {
  if (!rating) return undefined;
  const r = rating.toLowerCase();
  if (r.includes('fraud') || r.includes('bad') || r.includes('risky')) return 'high';
  if (r.includes('normal') || r.includes('average') || r.includes('medium')) return 'medium';
  if (r.includes('excellent') || r.includes('good') || r.includes('loyal')) return 'low';
  return undefined;
}

function aggregateProviders(providers: CourierProviderHistory[]): OrderCourierStats {
  let su = 0;
  let fa = 0;
  let to = 0;
  let co = 0;
  let any = false;
  for (const p of providers) {
    if (!p.available || !p.countsAvailable || !p.stats) continue;
    any = true;
    su += p.stats.su;
    fa += p.stats.fa;
    to += p.stats.to;
    co += p.stats.co;
  }
  if (!any) return emptyStats();
  return statsFromCounts(su, fa, to > 0 ? to : su + fa + co);
}

@Injectable()
export class CourierPhoneHistoryService {
  private readonly logger = new Logger(CourierPhoneHistoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: CourierIntegrationsService,
    private readonly pathao: PathaoCourierService,
    private readonly bdcourier: BdCourierService,
  ) {}

  async check(
    organizationId: string,
    phoneRaw: string,
    options?: { refresh?: boolean },
  ): Promise<CourierPhoneHistory> {
    const phoneNormalized = normalizeBdPhone(phoneRaw);
    if (!phoneNormalized || phoneNormalized.length < 10) {
      throw new BadRequestException('Valid Bangladesh mobile number required');
    }

    // Fresh cache → reuse. Missing/expired → live fetch (detail/create/ensureFresh).
    // List pages never call this — they use loadCachedStatsByPhones only.
    if (!options?.refresh) {
      const cached = await this.readCache(organizationId, phoneNormalized);
      if (cached && cached.expiresAt.getTime() > Date.now()) {
        return this.toResponse(phoneRaw, phoneNormalized, cached, 'cache', false);
      }
    }

    const live = await this.fetchLive(organizationId, phoneNormalized);
    await this.writeCache(organizationId, phoneNormalized, live);
    return {
      phone: phoneRaw,
      phoneNormalized,
      aggregate: live.aggregate,
      providers: live.providers,
      riskVerdict: live.riskVerdict,
      reports: live.reports,
      fetchedAt: live.fetchedAt,
      source: 'live',
    };
  }

  /**
   * Ensure org cache exists and is within TTL. No-op when fresh.
   * Await after order create before a second realtime tick so list success rate is ready.
   */
  async ensureFresh(organizationId: string, phoneRaw: string): Promise<void> {
    try {
      const phoneNormalized = normalizeBdPhone(phoneRaw);
      if (!phoneNormalized || phoneNormalized.length < 10) return;
      const cached = await this.readCache(organizationId, phoneNormalized);
      if (cached && cached.expiresAt.getTime() > Date.now()) return;
      await this.check(organizationId, phoneRaw, { refresh: true });
    } catch (err) {
      this.logger.warn(
        `ensureFresh courier history failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /** Cache-only map for list enrichment (no upstream calls). */
  async loadCachedStatsByPhones(
    organizationId: string,
    phones: string[],
  ): Promise<Map<string, OrderCourierStats>> {
    const result = new Map<string, OrderCourierStats>();
    if (phones.length === 0) return result;

    const normalizedToRaw = new Map<string, string[]>();
    for (const phone of phones) {
      const key = normalizeBdPhone(phone);
      if (!key) continue;
      const list = normalizedToRaw.get(key) ?? [];
      list.push(phone);
      normalizedToRaw.set(key, list);
    }

    const keys = [...normalizedToRaw.keys()];
    if (keys.length === 0) return result;

    try {
      const rows = await this.prisma.courierPhoneHistory.findMany({
        where: { organizationId, phoneNormalized: { in: keys } },
      });

      for (const row of rows) {
        const aggregate = row.aggregateJson as OrderCourierStats;
        for (const raw of normalizedToRaw.get(row.phoneNormalized) ?? []) {
          result.set(raw, aggregate);
        }
      }
    } catch (err) {
      this.logger.warn(
        `CourierPhoneHistory cache unavailable: ${err instanceof Error ? err.message : err}`,
      );
    }
    return result;
  }

  private async fetchLive(
    organizationId: string,
    phoneNormalized: string,
  ): Promise<LiveHistory> {
    const bdPublic = await this.integrations.getBdCourierPublic(organizationId);
    if (bdPublic.enabled && bdPublic.hasCredentials) {
      try {
        return await this.bdcourier.checkPhone(organizationId, phoneNormalized);
      } catch (err) {
        this.logger.warn(
          `BD Courier phone history fallback: ${err instanceof Error ? err.message : err}`,
        );
        // Fall through to Pathao-only if BD Courier fails.
      }
    }

    return this.fetchLivePathaoFallback(organizationId, phoneNormalized);
  }

  private async fetchLivePathaoFallback(
    organizationId: string,
    phoneNormalized: string,
  ): Promise<LiveHistory> {
    const fetchedAt = new Date().toISOString();
    const providers: CourierProviderHistory[] = [];

    const pathaoPublic = await this.integrations.getPathaoPublic(organizationId);
    if (pathaoPublic.enabled && pathaoPublic.hasCredentials) {
      try {
        const rate = await this.pathao.getUserSuccessRate(organizationId, phoneNormalized);
        providers.push({
          provider: 'pathao',
          label: 'Pathao',
          connected: true,
          available: true,
          status: 'ready',
          countsAvailable: rate.countsAvailable,
          stats: rate.countsAvailable
            ? statsFromCounts(rate.success, rate.failed, rate.total)
            : undefined,
          rating: rate.rating,
          riskLevel: riskFromPathaoRating(rate.rating),
          fetchedAt,
        });
      } catch (err) {
        const raw = err instanceof Error ? err.message : 'Pathao lookup failed';
        const soft = /unauthor/i.test(raw)
          ? 'History not available for this Pathao account yet'
          : 'Pathao history temporarily unavailable';
        this.logger.warn(`Pathao phone history: ${raw}`);
        providers.push({
          provider: 'pathao',
          label: 'Pathao',
          connected: true,
          available: false,
          status: 'unavailable',
          countsAvailable: false,
          error: soft,
          fetchedAt,
        });
      }
    } else {
      providers.push({
        provider: 'pathao',
        label: 'Pathao',
        connected: false,
        available: false,
        status: 'soon',
        countsAvailable: false,
        error: 'Connect BD Courier (or Pathao) in Settings for live lookup',
        fetchedAt,
      });
    }

    providers.push(
      soonProvider('steadfast', 'Steadfast', fetchedAt),
      soonProvider('redx', 'RedX', fetchedAt),
      soonProvider('carrybee', 'CarryBee', fetchedAt),
      soonProvider('paperfly', 'Paperfly', fetchedAt),
    );

    return {
      aggregate: aggregateProviders(providers),
      providers,
      reports: [],
      fetchedAt,
    };
  }

  private async readCache(organizationId: string, phoneNormalized: string) {
    try {
      return await this.prisma.courierPhoneHistory.findUnique({
        where: {
          organizationId_phoneNormalized: { organizationId, phoneNormalized },
        },
      });
    } catch (err) {
      this.logger.warn(
        `CourierPhoneHistory read failed: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  private async writeCache(organizationId: string, phoneNormalized: string, live: LiveHistory) {
    const hasCounts = live.providers.some((p) => p.countsAvailable && p.stats && p.stats.to > 0);
    const ttl = hasCounts ? CACHE_TTL_MS : ERROR_CACHE_TTL_MS;
    const expiresAt = new Date(Date.now() + ttl);
    const fetchedAt = new Date(live.fetchedAt);
    try {
      await this.prisma.courierPhoneHistory.upsert({
        where: {
          organizationId_phoneNormalized: { organizationId, phoneNormalized },
        },
        create: {
          organizationId,
          phoneNormalized,
          aggregateJson: live.aggregate,
          providersJson: {
            providers: live.providers,
            riskVerdict: live.riskVerdict,
            reports: live.reports ?? [],
          },
          fetchedAt,
          expiresAt,
        },
        update: {
          aggregateJson: live.aggregate,
          providersJson: {
            providers: live.providers,
            riskVerdict: live.riskVerdict,
            reports: live.reports ?? [],
          },
          fetchedAt,
          expiresAt,
        },
      });
    } catch (err) {
      this.logger.warn(
        `CourierPhoneHistory write failed (run prisma migrate deploy): ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  private toResponse(
    phoneRaw: string,
    phoneNormalized: string,
    row: {
      aggregateJson: unknown;
      providersJson: unknown;
      fetchedAt: Date;
      expiresAt: Date;
    },
    source: 'cache' | 'live',
    stale: boolean,
  ): CourierPhoneHistory {
    const raw = row.providersJson as
      | CourierProviderHistory[]
      | {
          providers?: CourierProviderHistory[];
          riskVerdict?: CourierRiskVerdict;
          reports?: CourierFraudReport[];
        };

    const providers = Array.isArray(raw) ? raw : (raw?.providers ?? []);
    const riskVerdict = Array.isArray(raw) ? undefined : raw?.riskVerdict;
    const reports = Array.isArray(raw) ? undefined : raw?.reports;

    return {
      phone: phoneRaw,
      phoneNormalized,
      aggregate: row.aggregateJson as OrderCourierStats,
      providers,
      riskVerdict,
      reports,
      fetchedAt: row.fetchedAt.toISOString(),
      source,
      stale,
    };
  }
}

function soonProvider(
  provider: CourierProviderHistory['provider'],
  label: string,
  fetchedAt: string,
): CourierProviderHistory {
  return {
    provider,
    label,
    connected: false,
    available: false,
    status: 'soon',
    countsAvailable: false,
    stats: emptyStats(),
    error: 'Coming soon',
    fetchedAt,
  };
}

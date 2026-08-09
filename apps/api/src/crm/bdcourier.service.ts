import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  CourierFraudReport,
  CourierProviderHistory,
  CourierRiskVerdict,
  OrderCourierStats,
} from '@laam/types';

import { CourierIntegrationsService } from './courier-integrations.service';
import { normalizeBdPhone } from './phone.util';

const BDCOURIER_BASE = 'https://api.bdcourier.com';

type BdCourierParcelStats = {
  name?: string;
  logo?: string;
  total_parcel?: number;
  success_parcel?: number;
  cancelled_parcel?: number;
  success_ratio?: number;
};

type BdCourierCheckResponse = {
  status?: string;
  message?: string;
  data?: Record<string, BdCourierParcelStats | undefined> & {
    summary?: BdCourierParcelStats;
  };
  reports?: unknown[];
  risk_verdict?: {
    level?: string;
    label?: string;
    action?: string;
    color?: string;
    reasons?: string[];
  };
};

const KNOWN_LABELS: Record<string, string> = {
  pathao: 'Pathao',
  steadfast: 'Steadfast',
  redx: 'RedX',
  carrybee: 'CarryBee',
  paperfly: 'Paperfly',
  parceldex: 'ParcelDex',
  courrierfast: 'CourrierFast',
};

const PREFERRED_ORDER = [
  'pathao',
  'steadfast',
  'redx',
  'carrybee',
  'paperfly',
  'parceldex',
  'courrierfast',
];

function emptyStats(): OrderCourierStats {
  return { to: 0, co: 0, su: 0, fa: 0, label: 'New', percent: 0 };
}

function statsFromParcel(raw?: BdCourierParcelStats): OrderCourierStats {
  if (!raw) return emptyStats();
  const to = Math.max(0, Number(raw.total_parcel) || 0);
  const su = Math.max(0, Number(raw.success_parcel) || 0);
  const fa = Math.max(0, Number(raw.cancelled_parcel) || 0);
  const co = Math.max(0, to - su - fa);
  const decided = su + fa;
  const percentRaw = Number(raw.success_ratio);
  const percent =
    Number.isFinite(percentRaw) && percentRaw >= 0
      ? Math.min(100, Math.max(0, Math.round(percentRaw * 10) / 10))
      : decided > 0
        ? Math.round((su / decided) * 1000) / 10
        : to > 0
          ? 100
          : 0;

  let label = 'New';
  if (to >= 10) label = 'Frequent';
  else if (to >= 2) label = 'Regular';
  if (decided >= 3 && percent < 50) label = 'Risky';

  return { to, co, su, fa, label, percent };
}

function mapRiskLevel(level?: string): CourierProviderHistory['riskLevel'] {
  if (!level) return undefined;
  const l = level.toLowerCase();
  if (l.includes('high') || l.includes('fraud') || l.includes('risky')) return 'high';
  if (l.includes('medium') || l.includes('moderate') || l.includes('caution')) return 'medium';
  if (l.includes('low') || l.includes('safe') || l.includes('good')) return 'low';
  return undefined;
}

function mapReports(raw: unknown[] | undefined): CourierFraudReport[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((item) => {
    if (!item || typeof item !== 'object') {
      return { details: String(item) };
    }
    const r = item as Record<string, unknown>;
    return {
      title: typeof r['title'] === 'string' ? r['title'] : undefined,
      details:
        typeof r['details'] === 'string'
          ? r['details']
          : typeof r['description'] === 'string'
            ? r['description']
            : typeof r['message'] === 'string'
              ? r['message']
              : undefined,
      date:
        typeof r['date'] === 'string'
          ? r['date']
          : typeof r['created_at'] === 'string'
            ? r['created_at']
            : undefined,
      image: typeof r['image'] === 'string' ? r['image'] : undefined,
      source:
        typeof r['source'] === 'string'
          ? r['source']
          : typeof r['courier'] === 'string'
            ? r['courier']
            : undefined,
    };
  });
}

function titleCaseSlug(slug: string): string {
  return slug.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isParcelStats(value: unknown): value is BdCourierParcelStats {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Dynamically map every courier block from BD Courier (future-proof). */
function mapProvidersFromData(
  data: NonNullable<BdCourierCheckResponse['data']>,
  fetchedAt: string,
): CourierProviderHistory[] {
  const entries: Array<{ key: string; raw: BdCourierParcelStats }> = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === 'summary') continue;
    if (!isParcelStats(value)) continue;
    if (!value.name && !value.logo && value.total_parcel == null) continue;
    entries.push({ key, raw: value });
  }

  const rank = new Map(PREFERRED_ORDER.map((id, i) => [id, i]));
  entries.sort((a, b) => {
    const ra = rank.get(a.key);
    const rb = rank.get(b.key);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return a.key.localeCompare(b.key);
  });

  return entries.map(({ key, raw }) => {
    const stats = statsFromParcel(raw);
    const hasCounts = stats.to > 0 || stats.su > 0 || stats.fa > 0;
    return {
      provider: key,
      label: raw.name?.trim() || KNOWN_LABELS[key] || titleCaseSlug(key),
      connected: true,
      available: true,
      status: 'ready' as const,
      countsAvailable: true,
      stats,
      logo: typeof raw.logo === 'string' ? raw.logo : undefined,
      rating: hasCounts ? String(Math.round(stats.percent)) : undefined,
      riskLevel:
        hasCounts && stats.percent < 50
          ? 'high'
          : hasCounts && stats.percent < 75
            ? 'medium'
            : hasCounts
              ? 'low'
              : undefined,
      fetchedAt,
    };
  });
}

@Injectable()
export class BdCourierService {
  private readonly logger = new Logger(BdCourierService.name);

  constructor(private readonly integrations: CourierIntegrationsService) {}

  async testConnection(organizationId: string): Promise<{ ok: true; message: string }> {
    const apiKey = await this.integrations.resolveBdCourierApiKey(organizationId);
    if (!apiKey) {
      throw new BadRequestException('Connect BD Courier and save an API key first');
    }
    const res = await fetch(`${BDCOURIER_BASE}/check-connection`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => null)) as {
      status?: string;
      message?: string;
    } | null;
    if (!res.ok || json?.status === 'error') {
      const msg = json?.message || `BD Courier connection failed (${res.status})`;
      await this.integrations.setBdCourierLastError(organizationId, msg);
      throw new ServiceUnavailableException(msg);
    }
    await this.integrations.setBdCourierLastError(organizationId, null);
    return { ok: true, message: json?.message || 'API connection successful' };
  }

  async getMyPlan(organizationId: string): Promise<{
    hasSubscription: boolean;
    planId: number | null;
    planName: string | null;
    planType: string | null;
    isFree: boolean | null;
    status: string;
    nextDueDate: string | null;
    expiresAt: string | null;
    daysRemaining: number | null;
    frequency: string | null;
    price: number | null;
    apiCalls: number;
    paidCalls: number;
    callLimit: number | null;
    paidLimit: number | null;
    remainingFreeCalls: number | null;
    remainingPaidCalls: number | null;
    fetchedAt: string;
  }> {
    const apiKey = await this.integrations.resolveBdCourierApiKey(organizationId);
    if (!apiKey) {
      throw new BadRequestException('Connect BD Courier and save an API key first');
    }

    const res = await fetch(`${BDCOURIER_BASE}/my-plan`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });

    const json = (await res.json().catch(() => null)) as {
      status?: string;
      message?: string;
      data?: Record<string, unknown>;
    } | null;

    if (!res.ok || json?.status === 'error' || !json?.data) {
      const msg = json?.message || `BD Courier plan lookup failed (${res.status})`;
      throw new ServiceUnavailableException(msg);
    }

    const d = json.data;
    const num = (v: unknown): number | null => {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const str = (v: unknown): string | null =>
      typeof v === 'string' ? v : v == null ? null : String(v);
    const bool = (v: unknown): boolean | null =>
      typeof v === 'boolean' ? v : v == null ? null : Boolean(v);

    return {
      hasSubscription: Boolean(d['has_subscription']),
      planId: num(d['plan_id']),
      planName: str(d['plan_name']),
      planType: str(d['plan_type']),
      isFree: bool(d['is_free']),
      status: str(d['status']) || 'inactive',
      nextDueDate: str(d['next_due_date']),
      expiresAt: str(d['expires_at']),
      daysRemaining: num(d['days_remaining']),
      frequency: str(d['frequency']),
      price: num(d['price']),
      apiCalls: num(d['api_calls']) ?? 0,
      paidCalls: num(d['paid_calls']) ?? 0,
      callLimit: num(d['call_limit']),
      paidLimit: num(d['paid_limit']),
      remainingFreeCalls: num(d['remaining_free_calls']),
      remainingPaidCalls: num(d['remaining_paid_calls']),
      fetchedAt: new Date().toISOString(),
    };
  }

  async checkPhone(
    organizationId: string,
    phoneNormalized: string,
  ): Promise<{
    aggregate: OrderCourierStats;
    providers: CourierProviderHistory[];
    riskVerdict?: CourierRiskVerdict;
    reports: CourierFraudReport[];
    fetchedAt: string;
  }> {
    const apiKey = await this.integrations.resolveBdCourierApiKey(organizationId);
    if (!apiKey) {
      throw new BadRequestException('BD Courier is not connected');
    }

    const phone = normalizeBdPhone(phoneNormalized) || phoneNormalized;
    const fetchedAt = new Date().toISOString();

    const res = await fetch(`${BDCOURIER_BASE}/courier-check`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
      signal: AbortSignal.timeout(25_000),
    });

    const json = (await res.json().catch(() => null)) as BdCourierCheckResponse | null;

    if (!res.ok || json?.status === 'error' || !json?.data) {
      const msg = json?.message || `BD Courier lookup failed (${res.status})`;
      if (/not found|no data|no record/i.test(msg)) {
        return {
          aggregate: emptyStats(),
          providers: [],
          reports: [],
          fetchedAt,
        };
      }
      this.logger.warn(`BD Courier check failed: ${msg}`);
      throw new ServiceUnavailableException(msg);
    }

    const data = json.data;
    const providers = mapProvidersFromData(data, fetchedAt);

    const summaryStats = statsFromParcel(data.summary);
    const aggregate =
      summaryStats.to > 0 || summaryStats.su > 0 || summaryStats.fa > 0
        ? summaryStats
        : providers.reduce(
            (acc, p) => {
              if (!p.stats) return acc;
              return {
                to: acc.to + p.stats.to,
                co: acc.co + p.stats.co,
                su: acc.su + p.stats.su,
                fa: acc.fa + p.stats.fa,
                label: acc.label,
                percent: 0,
              };
            },
            emptyStats(),
          );

    if (aggregate.to > 0 && !(data.summary && Number(data.summary.success_ratio) >= 0)) {
      const decided = aggregate.su + aggregate.fa;
      aggregate.percent =
        decided > 0 ? Math.round((aggregate.su / decided) * 1000) / 10 : 100;
      if (aggregate.to >= 10) aggregate.label = 'Frequent';
      else if (aggregate.to >= 2) aggregate.label = 'Regular';
      if (decided >= 3 && aggregate.percent < 50) aggregate.label = 'Risky';
    }

    const riskVerdict: CourierRiskVerdict | undefined = json.risk_verdict
      ? {
          level: json.risk_verdict.level || 'unknown',
          label: json.risk_verdict.label || json.risk_verdict.level || 'Unknown',
          action: json.risk_verdict.action,
          color: json.risk_verdict.color,
          reasons: json.risk_verdict.reasons,
        }
      : undefined;

    const overallRisk = mapRiskLevel(riskVerdict?.level);
    if (overallRisk === 'high' && aggregate.label !== 'Risky') {
      aggregate.label = 'Risky';
    }

    await this.integrations.setBdCourierLastError(organizationId, null);

    return {
      aggregate,
      providers,
      riskVerdict,
      reports: mapReports(json.reports),
      fetchedAt,
    };
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BlockedEntry,
  BlockedListQuery,
  BlockedListResponse,
  BlockReason,
  BlockType,
  CreateBlockedEntryPayload,
} from '@laam/types';

import type { ActorLabel } from '../common/actor.util';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeBdPhone } from './phone.util';

const BLOCK_REASONS = new Set<BlockReason>([
  'fraud',
  'duplicate',
  'abuse',
  'chargeback',
  'manual',
  'other',
]);

export function normalizeBlockPhone(value: string): string {
  return normalizeBdPhone(value) || value.replace(/\D/g, '');
}

export function normalizeBlockIp(value: string): string {
  const raw = value.trim().toLowerCase();
  if (raw.startsWith('::ffff:')) return raw.slice(7);
  return raw;
}

export function normalizeBlockValue(type: BlockType, value: string): string {
  return type === 'mobile' ? normalizeBlockPhone(value) : normalizeBlockIp(value);
}

function isValidIpShape(value: string): boolean {
  const v = normalizeBlockIp(value);
  // IPv4 simple
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(v)) {
    return v.split('.').every((part) => {
      const n = Number(part);
      return n >= 0 && n <= 255;
    });
  }
  // IPv6 loose
  if (v.includes(':') && /^[0-9a-f:]+$/i.test(v) && v.length >= 3) return true;
  return false;
}

@Injectable()
export class SecurityBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) throw new BadRequestException('Organization required');
  }

  private activeWhere(organizationId: string) {
    return {
      organizationId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };
  }

  async activeCount(organizationId: string): Promise<number> {
    return this.prisma.securityBlock.count({
      where: this.activeWhere(organizationId),
    });
  }

  /**
   * Returns true when phone and/or IP is currently blocked.
   * Checks primary phone, alternate phone (same type mobile), and IP.
   */
  async isBlocked(
    organizationId: string,
    opts: {
      phone?: string | null;
      altMobile?: string | null;
      /** Extra mobiles (e.g. edit form) */
      phones?: Array<string | null | undefined>;
      ip?: string | null;
    },
  ): Promise<{ blocked: boolean; type?: BlockType; value?: string; reason?: string }> {
    const checks: Array<{ type: BlockType; value: string }> = [];
    const seenMobile = new Set<string>();
    const phones = [
      opts.phone,
      opts.altMobile,
      ...(opts.phones ?? []),
    ];
    for (const raw of phones) {
      const phone = raw?.trim();
      if (!phone) continue;
      const digits = normalizeBlockPhone(phone);
      if (digits.length < 5 || seenMobile.has(digits)) continue;
      seenMobile.add(digits);
      checks.push({ type: 'mobile', value: digits });
    }
    const ip = opts.ip?.trim();
    if (ip && ip.toLowerCase() !== 'unknown') {
      const n = normalizeBlockIp(ip);
      if (n && isValidIpShape(n)) checks.push({ type: 'ip', value: n });
    }
    if (!checks.length) return { blocked: false };

    const rows = await this.prisma.securityBlock.findMany({
      where: {
        organizationId,
        OR: checks.map((c) => ({ type: c.type, value: c.value })),
        AND: [
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        ],
      },
      take: 1,
    });

    const hit = rows[0];
    if (!hit) return { blocked: false };
    return {
      blocked: true,
      type: hit.type as BlockType,
      value: hit.valueDisplay || hit.value,
      reason: hit.reason,
    };
  }

  async assertNotBlocked(
    organizationId: string,
    opts: {
      phone?: string | null;
      altMobile?: string | null;
      phones?: Array<string | null | undefined>;
      ip?: string | null;
    },
  ): Promise<void> {
    const hit = await this.isBlocked(organizationId, opts);
    if (!hit.blocked) return;
    const label = hit.type === 'ip' ? 'IP address' : 'mobile number';
    throw new BadRequestException(
      `This ${label} is blocked (${hit.reason ?? 'security'}) and cannot place orders.`,
    );
  }

  /** Prefer for order create/ingest: drop junk proxy values like "unknown". */
  sanitizeClientIp(raw?: string | null): string | undefined {
    const v = raw?.trim();
    if (!v || v.toLowerCase() === 'unknown') return undefined;
    const normalized = normalizeBlockIp(v);
    if (!normalized || !isValidIpShape(normalized)) return undefined;
    return normalized;
  }

  async list(
    organizationId: string,
    query: Partial<BlockedListQuery> & { page?: number; pageSize?: number },
  ): Promise<BlockedListResponse> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
    const now = new Date();
    const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const where = {
      organizationId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      ...(query.type ? { type: query.type } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { value: { contains: query.search.trim(), mode: 'insensitive' as const } },
              { valueDisplay: { contains: query.search.trim(), mode: 'insensitive' as const } },
              { note: { contains: query.search.trim(), mode: 'insensitive' as const } },
              { blockedByName: { contains: query.search.trim(), mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, rows, ipCount, mobileCount, expiringSoon] = await Promise.all([
      this.prisma.securityBlock.count({ where }),
      this.prisma.securityBlock.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.securityBlock.count({
        where: { ...this.activeWhere(organizationId), type: 'ip' },
      }),
      this.prisma.securityBlock.count({
        where: { ...this.activeWhere(organizationId), type: 'mobile' },
      }),
      this.prisma.securityBlock.count({
        where: {
          organizationId,
          expiresAt: { gt: now, lte: soon },
        },
      }),
    ]);

    return {
      items: rows.map((row) => this.toEntry(row)),
      total,
      page,
      pageSize,
      summary: {
        total: ipCount + mobileCount,
        ipCount,
        mobileCount,
        expiringSoon,
      },
    };
  }

  async create(
    organizationId: string,
    input: CreateBlockedEntryPayload,
    actor: ActorLabel,
    meta?: { lastOrderId?: string; orderCount?: number },
  ): Promise<BlockedEntry> {
    const type = input.type;
    if (type !== 'ip' && type !== 'mobile') {
      throw new BadRequestException('type must be ip or mobile');
    }
    if (!BLOCK_REASONS.has(input.reason)) {
      throw new BadRequestException('Invalid block reason');
    }

    const display = input.value.trim();
    const value = normalizeBlockValue(type, display);
    if (type === 'mobile' && value.length < 5) {
      throw new BadRequestException('Enter a valid mobile number');
    }
    if (type === 'ip' && !isValidIpShape(display)) {
      throw new BadRequestException('Enter a valid IPv4 or IPv6 address');
    }

    const expiresAt =
      input.expiresInDays && input.expiresInDays > 0
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

    const lastOrderId = meta?.lastOrderId?.trim() || null;
    const orderCount =
      typeof meta?.orderCount === 'number' && meta.orderCount > 0
        ? Math.floor(meta.orderCount)
        : lastOrderId
          ? 1
          : 0;

    try {
      const row = await this.prisma.securityBlock.upsert({
        where: {
          organizationId_type_value: {
            organizationId,
            type,
            value,
          },
        },
        create: {
          organizationId,
          type,
          value,
          valueDisplay: display,
          reason: input.reason,
          note: input.note?.trim() || null,
          blockedByUserId: actor.userId ?? null,
          blockedByName: actor.name ?? 'System',
          expiresAt,
          lastOrderId,
          orderCount,
        },
        update: {
          valueDisplay: display,
          reason: input.reason,
          note: input.note?.trim() || null,
          blockedByUserId: actor.userId ?? null,
          blockedByName: actor.name ?? 'System',
          expiresAt,
          ...(lastOrderId
            ? {
                lastOrderId,
                orderCount: { increment: 1 },
              }
            : {}),
        },
      });
      return this.toEntry(row);
    } catch {
      throw new ConflictException('Could not create block entry');
    }
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const existing = await this.prisma.securityBlock.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Block entry not found');
    await this.prisma.securityBlock.delete({ where: { id } });
  }

  private toEntry(row: {
    id: string;
    type: string;
    value: string;
    valueDisplay: string | null;
    reason: string;
    note: string | null;
    blockedByUserId: string | null;
    blockedByName: string | null;
    createdAt: Date;
    expiresAt: Date | null;
    orderCount: number;
    lastOrderId: string | null;
  }): BlockedEntry {
    return {
      id: row.id,
      type: row.type as BlockType,
      value: row.valueDisplay || row.value,
      reason: row.reason as BlockReason,
      note: row.note ?? undefined,
      blockedBy: row.blockedByUserId ?? 'system',
      blockedByName: row.blockedByName ?? 'System',
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString(),
      orderCount: row.orderCount,
      lastOrderId: row.lastOrderId ?? undefined,
    };
  }
}

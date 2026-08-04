import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateCustomerPayload,
  CustomerCompareOp,
  CustomerDetail,
  CustomerListItem,
  CustomerListQuery,
  CustomerListResponse,
  CustomerStatus,
  OrgCustomerStatus,
  UpdateCustomerPayload,
  UpsertOrgCustomerStatusPayload,
} from '@laam/types';
import type { Customer, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { ActorLabel } from '../common/actor.util';
import { splitCsv } from './customer-list-query.util';
import { CourierPhoneHistoryService } from './courier-phone-history.service';
import { normalizeBdPhone } from './phone.util';

type CustomerActivityJson = {
  id: string;
  label: string;
  description?: string;
  timestamp: string;
  actorName?: string;
};

const NOTE_UPDATED_LABEL = 'Note updated';

function parseCustomerActivities(value: unknown): CustomerActivityJson[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item, index) => ({
      id: typeof item.id === 'string' ? item.id : `act-${index}`,
      label: typeof item.label === 'string' ? item.label : 'Activity',
      description: typeof item.description === 'string' ? item.description : undefined,
      timestamp:
        typeof item.timestamp === 'string'
          ? item.timestamp
          : new Date().toISOString(),
      actorName: typeof item.actorName === 'string' ? item.actorName : undefined,
    }));
}

function appendNoteActivity(
  existing: CustomerActivityJson[],
  note: string | null | undefined,
  actor?: ActorLabel,
): CustomerActivityJson[] {
  const next: CustomerActivityJson = {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: NOTE_UPDATED_LABEL,
    description: note?.trim() || undefined,
    timestamp: new Date().toISOString(),
    actorName: actor?.name,
  };
  return [...existing, next].slice(-100);
}

const DELIVERED_STATUSES = new Set([
  'delivered',
  'completed',
  'partial_delivered',
]);
const FAILED_STATUSES = new Set([
  'failed',
  'returned',
  'pending_return',
  'cancelled',
]);

const DEFAULT_CUSTOMER_STATUSES: Array<{
  slug: string;
  label: string;
  isSystem?: boolean;
  sortOrder: number;
}> = [
  { slug: 'none', label: 'No status', isSystem: true, sortOrder: 0 },
  { slug: 'premium', label: 'Premium', isSystem: true, sortOrder: 1 },
];

function compareInt(
  op: CustomerCompareOp | undefined,
  value: number | undefined,
): Prisma.IntFilter | number | undefined {
  if (value === undefined || Number.isNaN(value)) return undefined;
  const operator = op ?? 'gte';
  if (operator === 'eq') return value;
  if (operator === 'gt') return { gt: value };
  if (operator === 'lt') return { lt: value };
  if (operator === 'lte') return { lte: value };
  return { gte: value };
}

function parseDayStart(value?: string): Date | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDayEnd(value?: string): Date | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setHours(23, 59, 59, 999);
  return d;
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courierPhoneHistory: CourierPhoneHistoryService,
  ) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
  }

  /**
   * Upsert buyer by phone and refresh order-derived stats.
   * Industry practice for BD COD: phone is the primary identity key.
   */
  async ensureFromOrder(
    organizationId: string,
    input: {
      name: string;
      phone: string;
      email?: string | null;
      altMobile?: string | null;
      district?: string | null;
      area?: string | null;
      address?: string | null;
      source?: string | null;
      assignedAgentName?: string | null;
      notes?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Customer> {
    const db = tx ?? this.prisma;
    const phoneNormalized = normalizeBdPhone(input.phone);
    if (!phoneNormalized || phoneNormalized.length < 10) {
      throw new BadRequestException('A valid customer phone is required');
    }

    const name = input.name.trim();
    if (!name) throw new BadRequestException('Customer name is required');

    const existing = await db.customer.findUnique({
      where: {
        organizationId_phoneNormalized: { organizationId, phoneNormalized },
      },
    });

    if (!existing) {
      const customerNumber = await this.nextCustomerNumber(organizationId, db);
      const created = await db.customer.create({
        data: {
          organizationId,
          customerNumber,
          phoneNormalized,
          phone: input.phone.trim(),
          name,
          email: input.email?.trim() || null,
          altMobile: input.altMobile?.trim() || null,
          district: input.district?.trim() || null,
          area: input.area?.trim() || null,
          address: input.address?.trim() || null,
          source: input.source?.trim() || null,
          assignedAgentName: input.assignedAgentName?.trim() || null,
          notes: input.notes?.trim() || null,
          status: 'none',
        },
      });
      return this.refreshStats(organizationId, created.id, db);
    }

    await db.customer.update({
      where: { id: existing.id },
      data: {
        name,
        phone: input.phone.trim(),
        ...(input.email !== undefined
          ? { email: input.email?.trim() || null }
          : {}),
        ...(input.altMobile !== undefined
          ? { altMobile: input.altMobile?.trim() || null }
          : {}),
        ...(input.district !== undefined
          ? { district: input.district?.trim() || null }
          : {}),
        ...(input.area !== undefined ? { area: input.area?.trim() || null } : {}),
        ...(input.address !== undefined
          ? { address: input.address?.trim() || null }
          : {}),
        ...(input.assignedAgentName
          ? { assignedAgentName: input.assignedAgentName.trim() }
          : {}),
        ...(input.notes?.trim() && !existing.notes
          ? { notes: input.notes.trim() }
          : {}),
      },
    });
    return this.refreshStats(organizationId, existing.id, db);
  }

  async refreshStats(
    organizationId: string,
    customerId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Customer> {
    const db = tx ?? this.prisma;
    const orders = await db.order.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { customerId },
          {
            customer: { is: null },
            customerPhone: {
              in: await this.phoneVariantsForCustomer(organizationId, customerId, db),
            },
          },
        ],
      },
      select: {
        id: true,
        status: true,
        amount: true,
        orderDate: true,
        createdAt: true,
        customerId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Link any unlinked orders that matched by phone
    const unlinkIds = orders.filter((o) => !o.customerId).map((o) => o.id);
    if (unlinkIds.length) {
      await db.order.updateMany({
        where: { id: { in: unlinkIds }, organizationId },
        data: { customerId },
      });
    }

    const linked = await db.order.findMany({
      where: { organizationId, customerId, deletedAt: null },
      select: {
        status: true,
        amount: true,
        orderDate: true,
        createdAt: true,
        lineItems: {
          select: { productName: true, quantity: true },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const orderCount = linked.length;
    const deliveredCount = linked.filter((o) => DELIVERED_STATUSES.has(o.status)).length;
    const failedCount = linked.filter((o) => FAILED_STATUSES.has(o.status)).length;
    const totalSpent = linked
      .filter((o) => DELIVERED_STATUSES.has(o.status) || o.status === 'partial_delivered')
      .reduce((sum, o) => sum + (o.amount || 0), 0);
    const dates = linked.map((o) => o.orderDate ?? o.createdAt).sort((a, b) => a.getTime() - b.getTime());

    return db.customer.update({
      where: { id: customerId },
      data: {
        orderCount,
        deliveredCount,
        failedCount,
        totalSpent,
        firstOrderAt: dates[0] ?? null,
        lastOrderAt: dates[dates.length - 1] ?? null,
        // status is admin-managed — do not auto-overwrite
      },
    });
  }

  async backfillFromOrders(organizationId: string): Promise<{ created: number; linked: number }> {
    const phones = await this.prisma.order.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        customerPhone: true,
        customerName: true,
        customerEmail: true,
        altMobile: true,
        district: true,
        shippingArea: true,
        shippingAddress: true,
        source: true,
        assignedAgentName: true,
        customerId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const byPhone = new Map<string, (typeof phones)[number]>();
    for (const row of phones) {
      const key = normalizeBdPhone(row.customerPhone);
      if (!key || byPhone.has(key)) continue;
      byPhone.set(key, row);
    }

    let created = 0;
    let linked = 0;
    for (const row of byPhone.values()) {
      const customer = await this.ensureFromOrder(organizationId, {
        name: row.customerName,
        phone: row.customerPhone,
        email: row.customerEmail,
        altMobile: row.altMobile,
        district: row.district,
        area: row.shippingArea,
        address: row.shippingAddress,
        source: row.source,
        assignedAgentName: row.assignedAgentName,
      });
      if (!row.customerId) created += 1;
      const result = await this.prisma.order.updateMany({
        where: {
          organizationId,
          deletedAt: null,
          customerId: null,
          customerPhone: row.customerPhone,
        },
        data: { customerId: customer.id },
      });
      linked += result.count;
    }
    return { created, linked };
  }

  async list(
    organizationId: string,
    query: CustomerListQuery,
  ): Promise<CustomerListResponse> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));

    const existingCount = await this.prisma.customer.count({ where: { organizationId } });
    if (existingCount === 0) {
      const orderCount = await this.prisma.order.count({
        where: { organizationId, deletedAt: null },
      });
      if (orderCount > 0) {
        await this.backfillFromOrders(organizationId);
      }
    }

    await this.ensureDefaultStatuses(organizationId);
    const where = await this.buildListWhere(organizationId, query);
    const statusRows = await this.prisma.orgCustomerStatus.findMany({
      where: { organizationId, deletedAt: null, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    const statusLabelBySlug = new Map(statusRows.map((s) => [s.slug, s.label]));

    const [total, rows, allForSummary] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        orderBy: [{ lastOrderAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.customer.findMany({
        where: { organizationId },
        select: {
          totalSpent: true,
          deliveredCount: true,
          failedCount: true,
          hasFollowUp: true,
          status: true,
          orderCount: true,
        },
      }),
    ]);

    const phones = rows.map((r) => r.phone);
    const networkByPhone = await this.courierPhoneHistory.loadCachedStatsByPhones(
      organizationId,
      phones,
    );
    this.courierPhoneHistory.warmMissing(organizationId, phones);

    const items = await Promise.all(
      rows.map((row) =>
        this.toListItem(row, statusLabelBySlug, networkByPhone.get(row.phone)),
      ),
    );
    const avgCourierRate =
      allForSummary.length === 0
        ? 0
        : allForSummary.reduce((sum, c) => {
            const attempts = c.deliveredCount + c.failedCount;
            return sum + (attempts > 0 ? (c.deliveredCount / attempts) * 100 : 0);
          }, 0) / allForSummary.length;

    const statusCounts = new Map<string, number>();
    for (const c of allForSummary) {
      statusCounts.set(c.status, (statusCounts.get(c.status) ?? 0) + 1);
    }

    return {
      items,
      total,
      page,
      pageSize,
      summary: {
        count: total,
        totalSpent: allForSummary.reduce((s, c) => s + c.totalSpent, 0),
        avgCourierRate: Math.round(avgCourierRate * 10) / 10,
        withFollowUpCount: allForSummary.filter((c) => c.hasFollowUp).length,
      },
      segments: [
        { id: 'all', label: 'All', count: allForSummary.length },
        {
          id: 'new',
          label: 'New',
          count: allForSummary.filter((c) => c.orderCount < 2).length,
        },
        {
          id: 'repeat',
          label: 'Repeat',
          count: allForSummary.filter((c) => c.orderCount >= 2).length,
        },
        {
          id: 'follow_up',
          label: 'Follow-up',
          count: allForSummary.filter((c) => c.hasFollowUp).length,
        },
        {
          id: 'high_risk',
          label: 'At risk',
          count: allForSummary.filter(
            (c) => c.failedCount >= 2 && c.orderCount >= 2,
          ).length,
        },
      ],
      statuses: statusRows.map((s) => ({
        id: s.slug,
        label: s.label,
        count: statusCounts.get(s.slug) ?? 0,
      })),
    };
  }

  async exportCsv(
    organizationId: string,
    query: CustomerListQuery,
  ): Promise<string> {
    await this.ensureDefaultStatuses(organizationId);
    const where = await this.buildListWhere(organizationId, {
      ...query,
      page: 1,
      pageSize: 5000,
    });
    const statusRows = await this.prisma.orgCustomerStatus.findMany({
      where: { organizationId, deletedAt: null },
    });
    const statusLabelBySlug = new Map(statusRows.map((s) => [s.slug, s.label]));
    const rows = await this.prisma.customer.findMany({
      where,
      orderBy: [{ lastOrderAt: 'desc' }, { createdAt: 'desc' }],
      take: 5000,
    });
    const header = [
      'Customer ID',
      'Name',
      'Phone',
      'Orders',
      'Delivered',
      'Courier %',
      'Status',
      'District',
      'Employee',
      'Follow-up',
      'Last order',
    ].join(',');
    const lines = rows.map((row) => {
      const score = this.courierScore(row);
      return [
        row.customerNumber,
        `"${row.name.replace(/"/g, '""')}"`,
        row.phone,
        row.orderCount,
        row.deliveredCount,
        score.rate,
        `"${(statusLabelBySlug.get(row.status) ?? row.status).replace(/"/g, '""')}"`,
        `"${(row.district ?? '').replace(/"/g, '""')}"`,
        `"${(row.assignedAgentName ?? '').replace(/"/g, '""')}"`,
        row.hasFollowUp ? 'yes' : 'no',
        row.lastOrderAt?.toISOString() ?? '',
      ].join(',');
    });
    return [header, ...lines].join('\n');
  }

  async listStatuses(organizationId: string): Promise<OrgCustomerStatus[]> {
    await this.ensureDefaultStatuses(organizationId);
    const rows = await this.prisma.orgCustomerStatus.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    return rows.map((row) => this.toStatus(row));
  }

  async upsertStatus(
    organizationId: string,
    input: UpsertOrgCustomerStatusPayload,
  ): Promise<OrgCustomerStatus> {
    await this.ensureDefaultStatuses(organizationId);
    const label = input.label.trim();
    if (!label) throw new BadRequestException('Label is required');
    const slug = (input.slug?.trim() || label)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    if (!slug) throw new BadRequestException('Slug is required');

    if (input.id) {
      const existing = await this.prisma.orgCustomerStatus.findFirst({
        where: { id: input.id, organizationId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Status not found');
      if (existing.isSystem && slug !== existing.slug) {
        throw new BadRequestException('System status slugs cannot be changed');
      }
      const updated = await this.prisma.orgCustomerStatus.update({
        where: { id: existing.id },
        data: {
          label,
          slug,
          color: input.color?.trim() || null,
          sortOrder: input.sortOrder ?? existing.sortOrder,
          isActive: input.isActive ?? existing.isActive,
        },
      });
      return this.toStatus(updated);
    }

    const created = await this.prisma.orgCustomerStatus.create({
      data: {
        organizationId,
        slug,
        label,
        color: input.color?.trim() || null,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
        isSystem: false,
      },
    });
    return this.toStatus(created);
  }

  async setStatusActive(
    organizationId: string,
    id: string,
    isActive: boolean,
  ): Promise<OrgCustomerStatus> {
    const existing = await this.prisma.orgCustomerStatus.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Status not found');
    const updated = await this.prisma.orgCustomerStatus.update({
      where: { id },
      data: { isActive },
    });
    return this.toStatus(updated);
  }

  async deleteStatus(organizationId: string, id: string): Promise<void> {
    const existing = await this.prisma.orgCustomerStatus.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Status not found');
    if (existing.isSystem) {
      throw new BadRequestException('System statuses cannot be deleted');
    }
    await this.prisma.orgCustomerStatus.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  private async ensureDefaultStatuses(organizationId: string): Promise<void> {
    const count = await this.prisma.orgCustomerStatus.count({
      where: { organizationId, deletedAt: null },
    });
    if (count > 0) return;
    await this.prisma.orgCustomerStatus.createMany({
      data: DEFAULT_CUSTOMER_STATUSES.map((s) => ({
        organizationId,
        slug: s.slug,
        label: s.label,
        sortOrder: s.sortOrder,
        isSystem: s.isSystem ?? false,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }

  private async buildListWhere(
    organizationId: string,
    query: CustomerListQuery,
  ): Promise<Prisma.CustomerWhereInput> {
    const search = query.search?.trim();
    const createdFrom = parseDayStart(query.createdFrom);
    const createdTo = parseDayEnd(query.createdTo);
    const lastOrderFrom = parseDayStart(query.lastOrderFrom);
    const lastOrderTo = parseDayEnd(query.lastOrderTo);
    const noOrderFrom = parseDayStart(query.noOrderFrom);
    const noOrderTo = parseDayEnd(query.noOrderTo);
    const followupFrom = parseDayStart(query.followupFrom);
    const followupTo = parseDayEnd(query.followupTo);
    const deliveredFrom = parseDayStart(query.deliveredFrom);
    const deliveredTo = parseDayEnd(query.deliveredTo);
    const orderCountFilter = compareInt(query.orderCountOp, query.orderCount);
    const deliveredFilter = compareInt(
      query.deliveredCountOp,
      query.deliveredCount,
    );
    const product = query.product?.trim();
    const employee = query.employee?.trim();
    const customerTag = query.customerTag?.trim();
    const courierScoreMin = query.courierScoreMin;
    const orderStatuses = splitCsv(query.orderStatuses);
    const orderSources = splitCsv(query.orderSources);

    const and: Prisma.CustomerWhereInput[] = [];

    if (query.segment === 'new') and.push({ orderCount: { lt: 2 } });
    if (query.segment === 'follow_up') and.push({ hasFollowUp: true });
    if (query.segment === 'repeat') and.push({ orderCount: { gte: 2 } });
    if (query.segment === 'high_risk') {
      and.push({ failedCount: { gte: 2 }, orderCount: { gte: 2 } });
    }
    // Legacy alias
    if (query.segment === 'premium') and.push({ status: 'premium' });

    if (query.status) and.push({ status: query.status });
    if (query.district?.trim()) {
      and.push({
        district: { contains: query.district.trim(), mode: 'insensitive' },
      });
    }
    if (employee) {
      and.push({
        assignedAgentName: { contains: employee, mode: 'insensitive' },
      });
    }
    if (customerTag) {
      and.push({ tags: { has: customerTag } });
    }
    if (search) {
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { customerNumber: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (createdFrom || createdTo) {
      and.push({
        createdAt: {
          ...(createdFrom ? { gte: createdFrom } : {}),
          ...(createdTo ? { lte: createdTo } : {}),
        },
      });
    }
    if (lastOrderFrom || lastOrderTo) {
      and.push({
        lastOrderAt: {
          ...(lastOrderFrom ? { gte: lastOrderFrom } : {}),
          ...(lastOrderTo ? { lte: lastOrderTo } : {}),
        },
      });
    }
    if (noOrderFrom || noOrderTo) {
      and.push({
        NOT: {
          orders: {
            some: {
              deletedAt: null,
              createdAt: {
                ...(noOrderFrom ? { gte: noOrderFrom } : {}),
                ...(noOrderTo ? { lte: noOrderTo } : {}),
              },
            },
          },
        },
      });
    }
    if (query.followupStatus === 'pending') and.push({ hasFollowUp: true });
    if (query.followupStatus === 'none') and.push({ hasFollowUp: false });
    if (query.followupStatus === 'overdue') {
      and.push({ hasFollowUp: true, followUpDue: { lt: new Date() } });
    }
    if (followupFrom || followupTo) {
      and.push({
        followUpDue: {
          ...(followupFrom ? { gte: followupFrom } : {}),
          ...(followupTo ? { lte: followupTo } : {}),
        },
      });
    }
    if (deliveredFrom || deliveredTo) {
      and.push({
        orders: {
          some: {
            deletedAt: null,
            status: { in: ['delivered', 'completed'] },
            updatedAt: {
              ...(deliveredFrom ? { gte: deliveredFrom } : {}),
              ...(deliveredTo ? { lte: deliveredTo } : {}),
            },
          },
        },
      });
    }
    if (orderCountFilter !== undefined) and.push({ orderCount: orderCountFilter });
    if (deliveredFilter !== undefined) and.push({ deliveredCount: deliveredFilter });
    if (query.amountMin !== undefined || query.amountMax !== undefined) {
      and.push({
        totalSpent: {
          ...(query.amountMin !== undefined ? { gte: query.amountMin } : {}),
          ...(query.amountMax !== undefined ? { lte: query.amountMax } : {}),
        },
      });
    }
    if (product) {
      const productClause: Prisma.CustomerWhereInput = {
        orders: {
          some: {
            deletedAt: null,
            lineItems: {
              some: { productName: { contains: product, mode: 'insensitive' } },
            },
          },
        },
      };
      and.push(query.productExclude ? { NOT: productClause } : productClause);
    }
    if (orderStatuses.length) {
      const statusClause: Prisma.CustomerWhereInput = {
        orders: {
          some: { deletedAt: null, status: { in: orderStatuses } },
        },
      };
      and.push(query.orderStatusesExclude ? { NOT: statusClause } : statusClause);
    }
    if (orderSources.length) {
      const sourceClause: Prisma.CustomerWhereInput = {
        orders: {
          some: { deletedAt: null, source: { in: orderSources } },
        },
      };
      and.push(query.orderSourcesExclude ? { NOT: sourceClause } : sourceClause);
    }
    if (courierScoreMin !== undefined && courierScoreMin > 0) {
      and.push({
        OR: [
          {
            AND: [{ deliveredCount: { gt: 0 } }, { failedCount: 0 }],
          },
          ...(courierScoreMin < 100
            ? [
                {
                  AND: [{ deliveredCount: { gte: 1 } }],
                } as Prisma.CustomerWhereInput,
              ]
            : []),
        ],
      });
    }

    const where: Prisma.CustomerWhereInput = {
      organizationId,
      ...(and.length ? { AND: and } : {}),
    };

    // Accurate courier score filter (post-candidate). For pagination safety when
    // courierScoreMin set, narrow with failed/delivered then filter IDs.
    if (courierScoreMin !== undefined && courierScoreMin > 0) {
      const candidates = await this.prisma.customer.findMany({
        where,
        select: { id: true, deliveredCount: true, failedCount: true },
      });
      const ids = candidates
        .filter((c) => {
          const attempts = c.deliveredCount + c.failedCount;
          if (attempts === 0) return false;
          const rate = (c.deliveredCount / attempts) * 100;
          return rate >= courierScoreMin;
        })
        .map((c) => c.id);
      return { organizationId, id: { in: ids.length ? ids : ['__none__'] } };
    }

    return where;
  }

  private toStatus(row: {
    id: string;
    organizationId: string;
    slug: string;
    label: string;
    color: string | null;
    sortOrder: number;
    isActive: boolean;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): OrgCustomerStatus {
    return {
      id: row.id,
      organizationId: row.organizationId,
      slug: row.slug,
      label: row.label,
      color: row.color ?? undefined,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      isSystem: row.isSystem,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async get(organizationId: string, id: string): Promise<CustomerDetail> {
    const row = await this.prisma.customer.findFirst({
      where: {
        organizationId,
        OR: [{ id }, { customerNumber: id }],
      },
    });
    if (!row) throw new NotFoundException('Customer not found');
    await this.refreshStats(organizationId, row.id);
    const fresh = await this.prisma.customer.findFirstOrThrow({
      where: { id: row.id },
    });
    return this.toDetail(fresh);
  }

  async create(
    organizationId: string,
    input: CreateCustomerPayload,
    actor?: ActorLabel,
  ): Promise<CustomerDetail> {
    const phoneNormalized = normalizeBdPhone(input.phone);
    if (!phoneNormalized || phoneNormalized.length < 10) {
      throw new BadRequestException('A valid phone number is required');
    }
    const existing = await this.prisma.customer.findUnique({
      where: {
        organizationId_phoneNormalized: { organizationId, phoneNormalized },
      },
    });
    if (existing) {
      throw new ConflictException('A customer with this phone already exists');
    }

    const customerNumber = await this.nextCustomerNumber(organizationId);
    const note = input.notes?.trim() || null;
    const activities = note ? appendNoteActivity([], note, actor) : [];
    const created = await this.prisma.customer.create({
      data: {
        organizationId,
        customerNumber,
        phoneNormalized,
        phone: input.phone.trim(),
        name: input.name.trim(),
        email: input.email?.trim() || null,
        altMobile: input.altMobile?.trim() || null,
        district: input.district?.trim() || null,
        area: input.area?.trim() || null,
        address: input.address?.trim() || null,
        notes: note,
        activities: activities as unknown as Prisma.InputJsonValue,
        tags: input.tags?.map((t) => t.trim()).filter(Boolean) ?? [],
        status: input.status ?? 'none',
        source: input.source?.trim() || 'manual',
        assignedAgentName: input.assignedAgentName?.trim() || null,
      } as Prisma.CustomerUncheckedCreateInput,
    });
    return this.toDetail(created);
  }

  async update(
    organizationId: string,
    id: string,
    patch: UpdateCustomerPayload,
    actor?: ActorLabel,
  ): Promise<CustomerDetail> {
    const existing = await this.prisma.customer.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Customer not found');

    let phoneNormalized = existing.phoneNormalized;
    let phone = existing.phone;
    if (patch.phone !== undefined) {
      phoneNormalized = normalizeBdPhone(patch.phone);
      if (!phoneNormalized || phoneNormalized.length < 10) {
        throw new BadRequestException('A valid phone number is required');
      }
      phone = patch.phone.trim();
      if (phoneNormalized !== existing.phoneNormalized) {
        const clash = await this.prisma.customer.findUnique({
          where: {
            organizationId_phoneNormalized: { organizationId, phoneNormalized },
          },
        });
        if (clash && clash.id !== id) {
          throw new ConflictException('Another customer already uses this phone');
        }
      }
    }

    const existingActivities = parseCustomerActivities(
      (existing as Customer & { activities?: unknown }).activities,
    );
    let nextActivities: CustomerActivityJson[] | undefined;
    if (patch.notes !== undefined && patch.notes !== (existing.notes ?? '')) {
      nextActivities = appendNoteActivity(
        existingActivities,
        patch.notes?.trim() || null,
        actor,
      );
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        phone,
        phoneNormalized,
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.email !== undefined ? { email: patch.email?.trim() || null } : {}),
        ...(patch.altMobile !== undefined
          ? { altMobile: patch.altMobile?.trim() || null }
          : {}),
        ...(patch.district !== undefined
          ? { district: patch.district?.trim() || null }
          : {}),
        ...(patch.area !== undefined ? { area: patch.area?.trim() || null } : {}),
        ...(patch.address !== undefined
          ? { address: patch.address?.trim() || null }
          : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes?.trim() || null } : {}),
        ...(nextActivities
          ? { activities: nextActivities as unknown as Prisma.InputJsonValue }
          : {}),
        ...(patch.tags !== undefined
          ? { tags: patch.tags.map((t) => t.trim()).filter(Boolean) }
          : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.source !== undefined ? { source: patch.source?.trim() || null } : {}),
        ...(patch.assignedAgentName !== undefined
          ? { assignedAgentName: patch.assignedAgentName?.trim() || null }
          : {}),
        ...(patch.hasFollowUp !== undefined ? { hasFollowUp: patch.hasFollowUp } : {}),
        ...(patch.followUpDue !== undefined
          ? {
              followUpDue: patch.followUpDue
                ? new Date(patch.followUpDue)
                : null,
            }
          : {}),
      } as Prisma.CustomerUncheckedUpdateInput,
    });
    return this.toDetail(updated);
  }

  async bulkAction(
    organizationId: string,
    payload: {
      customerIds: string[];
      note?: string;
      status?: CustomerStatus;
      assignedAgentName?: string;
      followUpDue?: string;
    },
    actor?: ActorLabel,
  ): Promise<{ successCount: number; failedCount: number; message?: string }> {
    const ids = [...new Set(payload.customerIds)].slice(0, 200);
    if (!ids.length) {
      throw new BadRequestException('No customers selected');
    }

    let successCount = 0;
    let failedCount = 0;
    for (const id of ids) {
      try {
        const existing = await this.prisma.customer.findFirst({
          where: { id, organizationId },
        });
        if (!existing) {
          failedCount += 1;
          continue;
        }

        const notePatch =
          payload.note?.trim()
            ? existing.notes?.trim()
              ? `${existing.notes.trim()}\n${payload.note.trim()}`
              : payload.note.trim()
            : undefined;

        await this.update(
          organizationId,
          id,
          {
            ...(payload.status ? { status: payload.status } : {}),
            ...(payload.assignedAgentName !== undefined
              ? { assignedAgentName: payload.assignedAgentName }
              : {}),
            ...(payload.followUpDue !== undefined
              ? { hasFollowUp: true, followUpDue: payload.followUpDue }
              : {}),
            ...(notePatch !== undefined ? { notes: notePatch } : {}),
          },
          actor,
        );
        successCount += 1;
      } catch {
        failedCount += 1;
      }
    }
    return {
      successCount,
      failedCount,
      message: `Updated ${successCount} customer(s)`,
    };
  }

  /**
   * Duplicate detection: same phoneNormalized (defensive) plus name+district collisions.
   * With unique phoneNormalized, true phone dups are rare; name collisions still matter.
   */
  async findDuplicates(
    organizationId: string,
  ): Promise<{ groups: Array<{ phone: string; phoneNormalized: string; customers: CustomerDetail[] }> }> {
    const rows = await this.prisma.customer.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });

    const byPhone = new Map<string, Customer[]>();
    for (const row of rows) {
      const key = row.phoneNormalized || normalizeBdPhone(row.phone);
      if (!key) continue;
      const list = byPhone.get(key) ?? [];
      list.push(row);
      byPhone.set(key, list);
    }

    const groups: Array<{
      phone: string;
      phoneNormalized: string;
      customers: CustomerDetail[];
    }> = [];

    for (const [phoneNormalized, list] of byPhone) {
      if (list.length < 2) continue;
      groups.push({
        phone: list[0]!.phone,
        phoneNormalized,
        customers: await Promise.all(list.map((c) => this.toDetail(c))),
      });
    }

    // Name + district near-duplicates (different phones, likely same person)
    const byNameDistrict = new Map<string, Customer[]>();
    for (const row of rows) {
      const nameKey = row.name.trim().toLowerCase().replace(/\s+/g, ' ');
      const districtKey = (row.district ?? '').trim().toLowerCase();
      if (!nameKey || nameKey.length < 3 || !districtKey) continue;
      const key = `${nameKey}|${districtKey}`;
      const list = byNameDistrict.get(key) ?? [];
      list.push(row);
      byNameDistrict.set(key, list);
    }
    for (const [, list] of byNameDistrict) {
      if (list.length < 2) continue;
      const phones = new Set(list.map((c) => c.phoneNormalized));
      if (phones.size < 2) continue; // already covered by phone group
      const already = groups.some((g) =>
        list.every((c) => g.customers.some((x) => x.id === c.id)),
      );
      if (already) continue;
      groups.push({
        phone: list.map((c) => c.phone).join(' / '),
        phoneNormalized: `name:${list[0]!.name}`,
        customers: await Promise.all(list.map((c) => this.toDetail(c))),
      });
    }

    return { groups };
  }

  /**
   * Merge duplicate customer profiles into primary.
   * Reassigns orders + follow-ups, merges tags/notes, refreshes stats, deletes dups.
   */
  async merge(
    organizationId: string,
    primaryId: string,
    duplicateIds: string[],
  ): Promise<CustomerDetail> {
    const uniqueDups = [...new Set(duplicateIds)].filter((id) => id !== primaryId);
    if (!uniqueDups.length) {
      throw new BadRequestException('Select at least one duplicate to merge');
    }

    const primary = await this.prisma.customer.findFirst({
      where: { id: primaryId, organizationId },
    });
    if (!primary) throw new NotFoundException('Primary customer not found');

    const duplicates = await this.prisma.customer.findMany({
      where: { organizationId, id: { in: uniqueDups } },
    });
    if (duplicates.length !== uniqueDups.length) {
      throw new NotFoundException('One or more duplicate customers were not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { organizationId, customerId: { in: uniqueDups } },
        data: { customerId: primaryId },
      });

      // Follow-up rows may store Customer.id or legacy phone-* keys
      await tx.followup.updateMany({
        where: { organizationId, customerId: { in: uniqueDups } },
        data: {
          customerId: primaryId,
          customerNumber: primary.customerNumber,
        },
      });

      const mergedTags = [
        ...new Set([...primary.tags, ...duplicates.flatMap((d) => d.tags)]),
      ].slice(0, 40);
      const noteParts = [primary.notes, ...duplicates.map((d) => d.notes)]
        .map((n) => n?.trim())
        .filter(Boolean);
      const mergedNotes = noteParts.length
        ? [...new Set(noteParts)].join('\n---\n').slice(0, 4000)
        : null;

      // Prefer non-empty profile fields from primary, fill gaps from dups
      let email = primary.email;
      let altMobile = primary.altMobile;
      let district = primary.district;
      let area = primary.area;
      let address = primary.address;
      let assignedAgentName = primary.assignedAgentName;
      for (const d of duplicates) {
        email = email || d.email;
        altMobile = altMobile || d.altMobile;
        district = district || d.district;
        area = area || d.area;
        address = address || d.address;
        assignedAgentName = assignedAgentName || d.assignedAgentName;
      }

      await tx.customer.update({
        where: { id: primaryId },
        data: {
          email,
          altMobile,
          district,
          area,
          address,
          assignedAgentName,
          tags: mergedTags,
          notes: mergedNotes,
          hasFollowUp: primary.hasFollowUp || duplicates.some((d) => d.hasFollowUp),
          followUpDue:
            [primary.followUpDue, ...duplicates.map((d) => d.followUpDue)]
              .filter(Boolean)
              .sort((a, b) => (a!.getTime() - b!.getTime()))[0] ?? null,
        },
      });

      await tx.customer.deleteMany({
        where: { organizationId, id: { in: uniqueDups } },
      });
    });

    await this.refreshStats(organizationId, primaryId);
    const fresh = await this.prisma.customer.findFirstOrThrow({
      where: { id: primaryId, organizationId },
    });
    return this.toDetail(fresh);
  }

  private async phoneVariantsForCustomer(
    organizationId: string,
    customerId: string,
    db: Prisma.TransactionClient | PrismaService,
  ): Promise<string[]> {
    const customer = await db.customer.findFirst({
      where: { id: customerId, organizationId },
      select: { phone: true, phoneNormalized: true },
    });
    if (!customer) return [];
    const variants = new Set<string>([customer.phone, customer.phoneNormalized]);
    const n = customer.phoneNormalized;
    if (n.startsWith('0') && n.length === 11) {
      variants.add(`880${n.slice(1)}`);
      variants.add(`+880${n.slice(1)}`);
    }
    return [...variants];
  }

  private async nextCustomerNumber(
    organizationId: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<string> {
    const count = await db.customer.count({ where: { organizationId } });
    return `CUS-${String(count + 1).padStart(5, '0')}`;
  }

  private courierScore(row: Customer) {
    const attempts = row.deliveredCount + row.failedCount;
    const rate = attempts > 0 ? Math.round((row.deliveredCount / attempts) * 1000) / 10 : 0;
    return {
      total: attempts,
      success: row.deliveredCount,
      failed: row.failedCount,
      rate,
    };
  }

  private async toListItem(
    row: Customer,
    statusLabelBySlug?: Map<string, string>,
    networkStats?: { to: number; su: number; fa: number; percent: number },
  ): Promise<CustomerListItem> {
    const recentOrders = await this.prisma.order.findMany({
      where: { organizationId: row.organizationId, customerId: row.id, deletedAt: null },
      include: {
        lineItems: { select: { productName: true, quantity: true }, take: 2 },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const recentProducts = recentOrders.flatMap((o) =>
      o.lineItems.map((li) => ({
        orderedAt: (o.orderDate ?? o.createdAt).toISOString(),
        productName: li.productName,
        quantity: li.quantity,
      })),
    );

    const courierScore = networkStats
      ? {
          total: networkStats.to,
          success: networkStats.su,
          failed: networkStats.fa,
          rate: networkStats.percent,
        }
      : this.courierScore(row);

    const courierShop = {
      to: row.orderCount,
      co: row.deliveredCount,
    };

    return {
      id: row.id,
      customerNumber: row.customerNumber,
      name: row.name,
      phone: row.phone,
      email: row.email ?? undefined,
      area: row.area ?? undefined,
      district: row.district ?? undefined,
      address: row.address ?? undefined,
      createdAt: row.createdAt.toISOString(),
      orderCount: row.orderCount,
      deliveredCount: row.deliveredCount,
      totalSpent: row.totalSpent,
      courierShop,
      courierScore,
      recentProducts: recentProducts.slice(0, 8),
      tags: row.tags,
      status: row.status,
      statusLabel: statusLabelBySlug?.get(row.status) ?? row.status,
      hasNotes: Boolean(row.notes?.trim()),
      lastNotePreview: row.notes?.trim() || undefined,
      hasFollowUp: row.hasFollowUp,
      followUpDue: row.followUpDue?.toISOString(),
      assignedAgentName: row.assignedAgentName ?? undefined,
      lastOrderAt: row.lastOrderAt?.toISOString(),
    };
  }

  private async toDetail(row: Customer): Promise<CustomerDetail> {
    let networkStats: { to: number; su: number; fa: number; percent: number } | undefined;
    try {
      const history = await this.courierPhoneHistory.check(row.organizationId, row.phone);
      networkStats = history.aggregate;
    } catch {
      networkStats = undefined;
    }
    const base = await this.toListItem(row, undefined, networkStats);
    const [orders, followups] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          organizationId: row.organizationId,
          customerId: row.id,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          amount: true,
          createdAt: true,
        },
      }),
      this.prisma.followup.findMany({
        where: {
          organizationId: row.organizationId,
          OR: [{ customerId: row.id }, { phone: row.phone }],
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          followupStatus: true,
          followupNotes: true,
          scheduleDate: true,
          createdAt: true,
        },
      }),
    ]);
    const storedActivities = parseCustomerActivities(
      (row as Customer & { activities?: unknown }).activities,
    );
    let noteActivities = storedActivities.filter(
      (a) => a.label === NOTE_UPDATED_LABEL,
    );
    // Legacy rows: note exists but never logged — show current note once.
    if (noteActivities.length === 0 && row.notes?.trim()) {
      noteActivities = [
        {
          id: `${row.id}-note-current`,
          label: NOTE_UPDATED_LABEL,
          description: row.notes.trim(),
          timestamp: row.updatedAt.toISOString(),
        },
      ];
    }

    return {
      ...base,
      notes: row.notes ?? undefined,
      activities: [
        ...noteActivities,
        ...orders.map((o) => ({
          id: o.id,
          label: `Order ${o.orderNumber}`,
          description: `${o.status} · ${o.amount}`,
          timestamp: o.createdAt.toISOString(),
        })),
        ...followups.map((f) => ({
          id: f.id,
          label: 'Follow-up',
          description:
            f.followupNotes?.trim() ||
            `${f.followupStatus}${f.scheduleDate ? ` · due ${f.scheduleDate.toISOString().slice(0, 10)}` : ''}`,
          timestamp: f.createdAt.toISOString(),
        })),
      ].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    };
  }
}

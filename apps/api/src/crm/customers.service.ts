import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateCustomerPayload,
  CustomerDetail,
  CustomerListItem,
  CustomerListQuery,
  CustomerListResponse,
  CustomerStatus,
  UpdateCustomerPayload,
} from '@laam/types';
import type { Customer, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { normalizeBdPhone } from './phone.util';

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

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

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
    const existing = await db.customer.findFirstOrThrow({
      where: { id: customerId, organizationId },
      select: { status: true },
    });
    const autoStatus = this.suggestStatus(orderCount, existing.status as CustomerStatus);

    return db.customer.update({
      where: { id: customerId },
      data: {
        orderCount,
        deliveredCount,
        failedCount,
        totalSpent,
        firstOrderAt: dates[0] ?? null,
        lastOrderAt: dates[dates.length - 1] ?? null,
        status: autoStatus,
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
    const search = query.search?.trim();

    // Lazy backfill once if empty but orders exist
    const existingCount = await this.prisma.customer.count({ where: { organizationId } });
    if (existingCount === 0) {
      const orderCount = await this.prisma.order.count({
        where: { organizationId, deletedAt: null },
      });
      if (orderCount > 0) {
        await this.backfillFromOrders(organizationId);
      }
    }

    const where: Prisma.CustomerWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.district
        ? { district: { contains: query.district, mode: 'insensitive' } }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { customerNumber: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.segment === 'follow_up' ? { hasFollowUp: true } : {}),
      ...(query.segment === 'premium' ? { status: 'premium' } : {}),
      ...(query.segment === 'repeat'
        ? { orderCount: { gte: 2 } }
        : {}),
      ...(query.segment === 'high_risk'
        ? { failedCount: { gte: 2 }, orderCount: { gte: 2 } }
        : {}),
    };

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

    const items = await Promise.all(rows.map((row) => this.toListItem(row)));
    const avgCourierRate =
      allForSummary.length === 0
        ? 0
        : allForSummary.reduce((sum, c) => {
            const attempts = c.deliveredCount + c.failedCount;
            return sum + (attempts > 0 ? (c.deliveredCount / attempts) * 100 : 0);
          }, 0) / allForSummary.length;

    return {
      items,
      total,
      page,
      pageSize,
      summary: {
        count: allForSummary.length,
        totalSpent: allForSummary.reduce((s, c) => s + c.totalSpent, 0),
        avgCourierRate: Math.round(avgCourierRate * 10) / 10,
        withFollowUpCount: allForSummary.filter((c) => c.hasFollowUp).length,
      },
      segments: [
        { id: 'all', label: 'All', count: allForSummary.length },
        {
          id: 'repeat',
          label: 'Repeat',
          count: allForSummary.filter((c) => c.orderCount >= 2).length,
        },
        {
          id: 'premium',
          label: 'Premium',
          count: allForSummary.filter((c) => c.status === 'premium').length,
        },
        {
          id: 'follow_up',
          label: 'Follow-up',
          count: allForSummary.filter((c) => c.hasFollowUp).length,
        },
        {
          id: 'high_risk',
          label: 'High risk',
          count: allForSummary.filter(
            (c) => c.failedCount >= 2 && c.orderCount >= 2,
          ).length,
        },
      ],
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
        notes: input.notes?.trim() || null,
        tags: input.tags?.map((t) => t.trim()).filter(Boolean) ?? [],
        status: input.status ?? 'none',
        source: input.source?.trim() || 'manual',
        assignedAgentName: input.assignedAgentName?.trim() || null,
      },
    });
    return this.toDetail(created);
  }

  async update(
    organizationId: string,
    id: string,
    patch: UpdateCustomerPayload,
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
      },
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
  ): Promise<{ successCount: number; failedCount: number; message?: string }> {
    const ids = [...new Set(payload.customerIds)].slice(0, 200);
    if (!ids.length) {
      throw new BadRequestException('No customers selected');
    }

    let successCount = 0;
    let failedCount = 0;
    for (const id of ids) {
      try {
        await this.update(organizationId, id, {
          ...(payload.status ? { status: payload.status } : {}),
          ...(payload.assignedAgentName !== undefined
            ? { assignedAgentName: payload.assignedAgentName }
            : {}),
          ...(payload.followUpDue !== undefined
            ? { hasFollowUp: true, followUpDue: payload.followUpDue }
            : {}),
          ...(payload.note
            ? {
                notes: payload.note,
              }
            : {}),
        });
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

  private suggestStatus(orderCount: number, current: CustomerStatus): CustomerStatus {
    if (current === 'premium' || current === 'ramadan') return current;
    if (orderCount >= 10) return '10_time';
    if (orderCount >= 5) return '5_time';
    if (orderCount >= 3) return '3_time';
    if (orderCount >= 2) return '2_time';
    return 'none';
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

  private async toListItem(row: Customer): Promise<CustomerListItem> {
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
      courierScore: this.courierScore(row),
      recentProducts: recentProducts.slice(0, 8),
      tags: row.tags,
      status: row.status as CustomerStatus,
      hasNotes: Boolean(row.notes?.trim()),
      hasFollowUp: row.hasFollowUp,
      followUpDue: row.followUpDue?.toISOString(),
      assignedAgentName: row.assignedAgentName ?? undefined,
      lastOrderAt: row.lastOrderAt?.toISOString(),
    };
  }

  private async toDetail(row: Customer): Promise<CustomerDetail> {
    const base = await this.toListItem(row);
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
    return {
      ...base,
      notes: row.notes ?? undefined,
      activities: [
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

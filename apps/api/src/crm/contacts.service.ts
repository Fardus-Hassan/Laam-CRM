import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ContactDetail,
  ContactListItem,
  ContactListQuery,
  ContactListResponse,
  ContactType,
  CreateContactPayload,
  OrderSource,
} from '@laam/types';
import type { Contact, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { normalizeBdPhone } from './phone.util';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
  }

  async list(
    organizationId: string,
    query: ContactListQuery,
  ): Promise<ContactListResponse> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const search = query.search?.trim();

    const where: Prisma.ContactWhereInput = {
      organizationId,
      ...(query.contactType ? { contactType: query.contactType } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { companyName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.segment === 'supplier' ? { contactType: 'supplier' } : {}),
      ...(query.segment === 'partner' ? { contactType: 'partner' } : {}),
      ...(query.segment === 'other' ? { contactType: 'other' } : {}),
    };

    const [total, rows, all] = await Promise.all([
      this.prisma.contact.count({ where }),
      this.prisma.contact.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.contact.findMany({
        where: { organizationId },
        select: { contactType: true },
      }),
    ]);

    const supplierCount = all.filter((c) => c.contactType === 'supplier').length;
    const partnerCount = all.filter((c) => c.contactType === 'partner').length;
    const customerTypeCount = all.filter((c) => c.contactType === 'customer').length;

    return {
      items: rows.map((row) => this.toListItem(row)),
      total,
      page,
      pageSize,
      summary: {
        count: all.length,
        customerCount: customerTypeCount,
        supplierCount,
        avgCourierRate: 0,
      },
      segments: [
        { id: 'all', label: 'All', count: all.length },
        { id: 'supplier', label: 'Suppliers', count: supplierCount },
        { id: 'partner', label: 'Partners', count: partnerCount },
        { id: 'other', label: 'Other', count: all.length - supplierCount - partnerCount - customerTypeCount },
      ],
    };
  }

  async get(organizationId: string, id: string): Promise<ContactDetail> {
    const row = await this.prisma.contact.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Contact not found');
    return {
      ...this.toListItem(row),
      notes: row.notes ?? undefined,
      activities: [],
    };
  }

  async create(
    organizationId: string,
    input: CreateContactPayload,
  ): Promise<ContactDetail> {
    const phone = input.phone.trim();
    if (!phone) throw new BadRequestException('Phone is required');
    const count = await this.prisma.contact.count({ where: { organizationId } });
    const created = await this.prisma.contact.create({
      data: {
        organizationId,
        contactNumber: `CON-${String(count + 1).padStart(5, '0')}`,
        name: input.name.trim(),
        phone,
        phoneNormalized: normalizeBdPhone(phone) || null,
        email: input.email?.trim() || null,
        contactType: input.contactType ?? 'other',
        companyName: input.organizationName?.trim() || null,
        jobTitle: input.roleLabel?.trim() || null,
        source: input.source ?? 'call',
        assignedAgentName: input.assignedAgentName?.trim() || null,
        district: input.district?.trim() || null,
        area: input.area?.trim() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
        inventorySupplierId: input.inventorySupplierId?.trim() || null,
      },
    });

    const shouldSync =
      input.syncInventorySupplier !== false &&
      (input.contactType === 'supplier' || Boolean(input.inventorySupplierId));
    if (shouldSync && input.contactType === 'supplier' && !input.inventorySupplierId) {
      const supplierId = await this.ensureInventorySupplier(organizationId, {
        name: input.organizationName?.trim() || input.name.trim(),
        phone,
        contactPerson: input.name.trim(),
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
      });
      await this.prisma.contact.update({
        where: { id: created.id },
        data: { inventorySupplierId: supplierId },
      });
    }

    return this.get(organizationId, created.id);
  }

  async update(
    organizationId: string,
    id: string,
    patch: Partial<CreateContactPayload> & {
      notes?: string;
      tags?: string[];
      syncInventorySupplier?: boolean;
    },
  ): Promise<ContactDetail> {
    const existing = await this.prisma.contact.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Contact not found');

    await this.prisma.contact.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.phone !== undefined
          ? {
              phone: patch.phone.trim(),
              phoneNormalized: normalizeBdPhone(patch.phone) || null,
            }
          : {}),
        ...(patch.email !== undefined ? { email: patch.email?.trim() || null } : {}),
        ...(patch.contactType !== undefined ? { contactType: patch.contactType } : {}),
        ...(patch.organizationName !== undefined
          ? { companyName: patch.organizationName?.trim() || null }
          : {}),
        ...(patch.roleLabel !== undefined
          ? { jobTitle: patch.roleLabel?.trim() || null }
          : {}),
        ...(patch.source !== undefined ? { source: patch.source } : {}),
        ...(patch.assignedAgentName !== undefined
          ? { assignedAgentName: patch.assignedAgentName?.trim() || null }
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
        ...(patch.inventorySupplierId !== undefined
          ? { inventorySupplierId: patch.inventorySupplierId?.trim() || null }
          : {}),
      },
    });

    if (
      patch.syncInventorySupplier !== false &&
      (patch.contactType === 'supplier' || existing.contactType === 'supplier') &&
      patch.inventorySupplierId === undefined
    ) {
      const fresh = await this.prisma.contact.findFirstOrThrow({ where: { id } });
      if (!fresh.inventorySupplierId && fresh.contactType === 'supplier') {
        const supplierId = await this.ensureInventorySupplier(organizationId, {
          name: fresh.companyName || fresh.name,
          phone: fresh.phone,
          contactPerson: fresh.name,
          email: fresh.email,
          address: fresh.address,
        });
        await this.prisma.contact.update({
          where: { id },
          data: { inventorySupplierId: supplierId },
        });
      }
    }

    return this.get(organizationId, id);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const existing = await this.prisma.contact.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Contact not found');
    await this.prisma.contact.delete({ where: { id } });
  }

  async bulkAction(
    organizationId: string,
    payload: {
      contactIds: string[];
      note?: string;
      assignedAgentName?: string;
      followUpDue?: string;
    },
  ): Promise<{ successCount: number; failedCount: number; message?: string }> {
    const ids = [...new Set(payload.contactIds.filter(Boolean))];
    if (!ids.length) {
      return { successCount: 0, failedCount: 0, message: 'No contacts selected' };
    }

    const rows = await this.prisma.contact.findMany({
      where: { organizationId, id: { in: ids } },
      select: { id: true, notes: true },
    });
    const found = new Set(rows.map((r) => r.id));
    let successCount = 0;

    for (const row of rows) {
      const nextNotes =
        payload.note?.trim()
          ? [row.notes?.trim(), payload.note.trim()].filter(Boolean).join('\n')
          : undefined;
      await this.prisma.contact.update({
        where: { id: row.id },
        data: {
          ...(nextNotes !== undefined ? { notes: nextNotes } : {}),
          ...(payload.assignedAgentName !== undefined
            ? { assignedAgentName: payload.assignedAgentName.trim() || null }
            : {}),
        },
      });
      successCount += 1;
    }

    const failedCount = ids.filter((id) => !found.has(id)).length;
    return {
      successCount,
      failedCount,
      message: `Updated ${successCount} contact(s)`,
    };
  }

  private async ensureInventorySupplier(
    organizationId: string,
    input: {
      name: string;
      phone: string;
      contactPerson?: string | null;
      email?: string | null;
      address?: string | null;
    },
  ): Promise<string> {
    const name = input.name.trim();
    const phone = input.phone.trim();
    const existing = await this.prisma.inventorySupplier.findFirst({
      where: {
        organizationId,
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { phone },
        ],
      },
      select: { id: true },
    });
    if (existing) return existing.id;

    try {
      const created = await this.prisma.inventorySupplier.create({
        data: {
          organizationId,
          name,
          phone,
          contactPerson: input.contactPerson?.trim() || null,
          email: input.email?.trim() || null,
          address: input.address?.trim() || null,
          status: 'active',
          tags: ['from-contact'],
        },
        select: { id: true },
      });
      return created.id;
    } catch {
      const fallback = await this.prisma.inventorySupplier.findFirst({
        where: { organizationId, name },
        select: { id: true },
      });
      if (fallback) return fallback.id;
      throw new BadRequestException('Could not link inventory supplier');
    }
  }

  private toListItem(row: Contact): ContactListItem {
    return {
      id: row.id,
      contactNumber: row.contactNumber ?? undefined,
      name: row.name,
      phone: row.phone,
      email: row.email ?? undefined,
      contactType: (row.contactType as ContactType) || 'other',
      organizationName: row.companyName ?? undefined,
      roleLabel: row.jobTitle ?? undefined,
      source: (row.source as OrderSource) || 'call',
      area: row.area ?? undefined,
      district: row.district ?? undefined,
      address: row.address ?? undefined,
      assignedAgentName: row.assignedAgentName ?? undefined,
      createdAt: row.createdAt.toISOString(),
      lastContactAt: row.updatedAt.toISOString(),
      tags: row.tags,
      hasNotes: Boolean(row.notes?.trim()),
      recentProducts: [],
      inventorySupplierId: row.inventorySupplierId ?? undefined,
    };
  }
}

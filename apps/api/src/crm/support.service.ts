import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateTicketPayload,
  SupportTicket,
  TicketListQuery,
  TicketListResponse,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from '@laam/types';
import type { Prisma, SupportTicket as SupportTicketRow } from '@prisma/client';
import { randomUUID } from 'crypto';

import type { ActorLabel } from '../common/actor.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
  }

  async list(
    organizationId: string,
    query: TicketListQuery,
  ): Promise<TicketListResponse> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const search = query.search?.trim();

    const where: Prisma.SupportTicketWhereInput = { organizationId };
    if (query.status) where.status = query.status;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerMobile: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { assigneeName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, rows, allForSummary] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.supportTicket.findMany({
        where: { organizationId },
        select: { status: true, priority: true },
      }),
    ]);

    return {
      items: rows.map((r) => this.toTicket(r)),
      total,
      page,
      pageSize,
      summary: {
        open: allForSummary.filter((t) => t.status === 'open').length,
        pending: allForSummary.filter((t) => t.status === 'pending').length,
        resolved: allForSummary.filter((t) => t.status === 'resolved').length,
        urgent: allForSummary.filter(
          (t) =>
            t.priority === 'urgent' &&
            (t.status === 'open' || t.status === 'pending'),
        ).length,
      },
    };
  }

  async getById(organizationId: string, id: string): Promise<SupportTicket> {
    const row = await this.prisma.supportTicket.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Ticket not found');
    return this.toTicket(row);
  }

  async create(
    organizationId: string,
    input: CreateTicketPayload,
    actor?: ActorLabel,
  ): Promise<SupportTicket> {
    const subject = input.subject?.trim();
    const body = input.body?.trim();
    const customerName = input.customerName?.trim();
    const customerMobile = input.customerMobile?.trim();
    if (!subject || subject.length < 3) {
      throw new BadRequestException('Subject must be at least 3 characters');
    }
    if (!body || body.length < 3) {
      throw new BadRequestException('Message must be at least 3 characters');
    }
    if (!customerName) throw new BadRequestException('Customer name is required');
    if (!customerMobile) {
      throw new BadRequestException('Customer mobile is required');
    }

    const orderNumber = input.orderNumber?.trim() || null;
    let orderId: string | null = null;
    if (orderNumber) {
      const order = await this.prisma.order.findFirst({
        where: { organizationId, orderNumber, deletedAt: null },
        select: { id: true },
      });
      orderId = order?.id ?? null;
    }

    const now = new Date();
    const messages: TicketMessage[] = [
      {
        id: randomUUID(),
        authorName: actor?.name || 'Staff',
        authorRole: 'agent',
        body,
        createdAt: now.toISOString(),
      },
    ];

    const row = await this.prisma.supportTicket.create({
      data: {
        organizationId,
        subject,
        status: 'open',
        priority: input.priority ?? 'medium',
        customerName,
        customerMobile,
        orderId,
        orderNumber,
        assigneeName: actor?.name || null,
        createdByUserId: actor?.userId || null,
        createdByName: actor?.name || null,
        messages: messages as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toTicket(row);
  }

  async reply(
    organizationId: string,
    id: string,
    body: string,
    actor?: ActorLabel,
  ): Promise<SupportTicket> {
    const text = body?.trim();
    if (!text) throw new BadRequestException('Reply body is required');

    const existing = await this.prisma.supportTicket.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Ticket not found');

    const messages = this.readMessages(existing.messages);
    messages.push({
      id: randomUUID(),
      authorName: actor?.name || 'Staff',
      authorRole: 'agent',
      body: text,
      createdAt: new Date().toISOString(),
    });

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        messages: messages as unknown as Prisma.InputJsonValue,
        ...(existing.status === 'open' ? { status: 'pending' } : {}),
      },
    });

    return this.toTicket(updated);
  }

  async updateStatus(
    organizationId: string,
    id: string,
    status: TicketStatus,
    actor?: ActorLabel,
  ): Promise<SupportTicket> {
    const existing = await this.prisma.supportTicket.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Ticket not found');

    const messages = this.readMessages(existing.messages);
    if (status !== existing.status) {
      messages.push({
        id: randomUUID(),
        authorName: actor?.name || 'System',
        authorRole: 'system',
        body: `Status → ${status}`,
        createdAt: new Date().toISOString(),
      });
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status,
        messages: messages as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toTicket(updated);
  }

  async openCount(organizationId: string): Promise<number> {
    return this.prisma.supportTicket.count({
      where: {
        organizationId,
        status: { in: ['open', 'pending'] },
      },
    });
  }

  private toTicket(row: SupportTicketRow): SupportTicket {
    return {
      id: row.id,
      subject: row.subject,
      status: row.status as TicketStatus,
      priority: row.priority as TicketPriority,
      customerName: row.customerName,
      customerMobile: row.customerMobile,
      orderId: row.orderId ?? undefined,
      orderNumber: row.orderNumber ?? undefined,
      assigneeName: row.assigneeName ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      messages: this.readMessages(row.messages),
    };
  }

  private readMessages(raw: unknown): TicketMessage[] {
    if (!Array.isArray(raw)) return [];
    const out: TicketMessage[] = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      if (typeof o['id'] !== 'string' || typeof o['body'] !== 'string') continue;
      const role = o['authorRole'];
      if (role !== 'agent' && role !== 'customer' && role !== 'system') continue;
      out.push({
        id: o['id'] as string,
        authorName: typeof o['authorName'] === 'string' ? o['authorName'] : 'Unknown',
        authorRole: role,
        body: o['body'] as string,
        createdAt:
          typeof o['createdAt'] === 'string'
            ? o['createdAt']
            : new Date().toISOString(),
      });
    }
    return out;
  }
}

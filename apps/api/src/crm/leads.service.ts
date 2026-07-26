import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateLeadPayload,
  LeadActivity,
  LeadConvertPrefill,
  LeadDetail,
  LeadLineItem,
  LeadListQuery,
  LeadListResponse,
  LeadPipelineQuery,
  LeadPipelineStats,
  LeadStatus,
  OrderSource,
} from '@laam/types';
import type { Lead, Prisma } from '@prisma/client';

import type { ActorLabel } from '../common/actor.util';
import { PrismaService } from '../prisma/prisma.service';

const LEAD_STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'converted',
  'lost',
];

type LeadLineJson = {
  id?: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
  productId?: string;
  variantId?: string;
  variationLabel?: string;
};

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
  }

  async ensureDemoLeads(organizationId: string): Promise<void> {
    const count = await this.prisma.lead.count({ where: { organizationId } });
    if (count > 0) return;

    // Claim legacy seed rows that were created without organizationId.
    const claimed = await this.prisma.lead.updateMany({
      where: {
        organizationId: null,
        leadNumber: { in: ['LD-2001', 'LD-2002', 'LD-2003'] },
      },
      data: { organizationId },
    });
    if (claimed.count > 0) return;

    const now = new Date();
    const catalogProduct = await this.prisma.product.findFirst({
      where: { organizationId, status: 'active' },
      include: { variants: { take: 1, orderBy: { createdAt: 'asc' } } },
    });
    const variant = catalogProduct?.variants[0];
    const sampleLine: LeadLineJson | null =
      catalogProduct && variant
        ? {
            id: 'li-1',
            productName: catalogProduct.name,
            sku: variant.sku ?? undefined,
            quantity: 1,
            unitPrice: Number(variant.salePrice ?? 0) || 1200,
            lineTotal: Number(variant.salePrice ?? 0) || 1200,
            productId: catalogProduct.id,
            variantId: variant.id,
            variationLabel: variant.label || 'Default',
          }
        : {
            id: 'li-1',
            productName: 'Sample Product',
            quantity: 1,
            unitPrice: 1200,
            lineTotal: 1200,
          };

    const seeds: Array<{
      leadNumber: string;
      name: string;
      phone: string;
      email?: string;
      source: string;
      status: string;
      area: string;
      address: string;
      estimatedValue: number;
      campaignName: string;
      notes?: string;
      lineItems: LeadLineJson[];
    }> = [
      {
        leadNumber: 'LD-2001',
        name: 'Rahim Uddin',
        phone: '01700000001',
        email: 'rahim@email.com',
        source: 'facebook',
        status: 'new',
        area: 'Dhaka',
        address: 'House 12, Road 5, Gulshan 1',
        estimatedValue: 6000,
        campaignName: 'FB Lead Form',
        notes: 'Interested — convert to order',
        lineItems: sampleLine ? [{ ...sampleLine, quantity: 2, lineTotal: sampleLine.unitPrice * 2 }] : [],
      },
      {
        leadNumber: 'LD-2002',
        name: 'Fatema Akter',
        phone: '01700000002',
        email: 'fatema@email.com',
        source: 'call',
        status: 'contacted',
        area: 'Dhaka',
        address: 'Flat B3, Banani 11',
        estimatedValue: 7000,
        campaignName: 'Inbound',
        lineItems: sampleLine ? [sampleLine] : [],
      },
      {
        leadNumber: 'LD-2003',
        name: 'Karim Hassan',
        phone: '01700000003',
        source: 'website',
        status: 'qualified',
        area: 'Chattogram',
        address: 'Agrabad C/A',
        estimatedValue: 4500,
        campaignName: 'Website Form',
        lineItems: [],
      },
    ];

    await this.prisma.lead.createMany({
      data: seeds.map((s) => {
        const productSummary =
          s.lineItems.length > 0
            ? s.lineItems.map((l) => `${l.productName} ×${l.quantity}`).join(', ')
            : null;
        const itemCount = s.lineItems.reduce((sum, l) => sum + l.quantity, 0) || null;
        return {
          organizationId,
          leadNumber: s.leadNumber,
          name: s.name,
          phone: s.phone,
          email: s.email ?? null,
          source: s.source,
          status: s.status,
          area: s.area,
          address: s.address,
          estimatedValue: s.estimatedValue,
          campaignName: s.campaignName,
          notes: s.notes ?? null,
          tags: [] as string[],
          productSummary,
          itemCount,
          lastActivityAt: now,
          lineItems: s.lineItems as unknown as Prisma.InputJsonValue,
          activities: [
            {
              id: `act-${s.leadNumber}`,
              type: 'created',
              label: 'Lead created',
              timestamp: now.toISOString(),
            },
          ] as unknown as Prisma.InputJsonValue,
        };
      }),
      skipDuplicates: true,
    });
  }

  async list(
    organizationId: string,
    query: LeadListQuery,
  ): Promise<LeadListResponse> {
    await this.ensureDemoLeads(organizationId);

    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where: Prisma.LeadWhereInput = { organizationId };
    const and: Prisma.LeadWhereInput[] = [];

    if (query.status === 'unassigned') {
      and.push({ OR: [{ assignedAgentName: null }, { assignedAgentName: '' }] });
    } else if (query.status) {
      and.push({ status: query.status });
    }
    if (query.source) and.push({ source: query.source });
    if (query.agent) {
      and.push({
        assignedAgentName: { contains: query.agent, mode: 'insensitive' },
      });
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      and.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { leadNumber: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    if (and.length > 0) where.AND = and;

    const [total, rows, valueAgg, unassignedCount] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.lead.aggregate({
        where,
        _sum: { estimatedValue: true },
      }),
      this.prisma.lead.count({
        where: {
          organizationId,
          OR: [{ assignedAgentName: null }, { assignedAgentName: '' }],
        },
      }),
    ]);

    return {
      items: rows.map((r) => this.toListItem(r)),
      total,
      page,
      pageSize,
      summary: {
        count: total,
        totalEstimatedValue: valueAgg._sum.estimatedValue ?? 0,
        unassignedCount,
      },
    };
  }

  async getPipelineStats(
    organizationId: string,
    query: LeadPipelineQuery = {},
  ): Promise<LeadPipelineStats> {
    await this.ensureDemoLeads(organizationId);

    const base: Prisma.LeadWhereInput = { organizationId };
    if (query.source) base.source = query.source;
    if (query.agent) {
      base.assignedAgentName = { contains: query.agent, mode: 'insensitive' };
    }

    const [rows, valueAgg, unassignedCount] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['status'],
        where: base,
        _count: { _all: true },
      }),
      this.prisma.lead.aggregate({
        where: base,
        _sum: { estimatedValue: true },
      }),
      this.prisma.lead.count({
        where: {
          ...base,
          OR: [{ assignedAgentName: null }, { assignedAgentName: '' }],
        },
      }),
    ]);

    const countByStatus = Object.fromEntries(
      rows.map((r) => [r.status, r._count._all]),
    ) as Record<string, number>;
    const totalCount = rows.reduce((sum, r) => sum + r._count._all, 0);
    const convertedCount = countByStatus.converted ?? 0;

    const stages = [
      { id: 'all' as const, label: 'All', color: '#64748b' },
      { id: 'unassigned' as const, label: 'Unassigned', color: '#94a3b8' },
      { id: 'new' as const, label: 'New', color: '#3b82f6' },
      { id: 'contacted' as const, label: 'Contacted', color: '#f59e0b' },
      { id: 'qualified' as const, label: 'Qualified', color: '#8b5cf6' },
      { id: 'converted' as const, label: 'Converted', color: '#22c55e' },
      { id: 'lost' as const, label: 'Lost', color: '#ef4444' },
    ].map((stage) => {
      const count =
        stage.id === 'all'
          ? totalCount
          : stage.id === 'unassigned'
            ? unassignedCount
            : (countByStatus[stage.id] ?? 0);
      return {
        ...stage,
        count,
        share: totalCount > 0 ? (count / totalCount) * 100 : 0,
      };
    });

    return {
      stages,
      totalCount,
      totalEstimatedValue: valueAgg._sum.estimatedValue ?? 0,
      unassignedCount,
      convertedCount,
      conversionRate: totalCount > 0 ? (convertedCount / totalCount) * 100 : 0,
    };
  }

  async getByIdOrNumber(
    organizationId: string,
    idOrNumber: string,
  ): Promise<LeadDetail> {
    await this.ensureDemoLeads(organizationId);
    const row = await this.prisma.lead.findFirst({
      where: {
        organizationId,
        OR: [{ id: idOrNumber }, { leadNumber: idOrNumber }],
      },
    });
    if (!row) throw new NotFoundException('Lead not found');
    return this.toDetail(row);
  }

  async create(
    organizationId: string,
    input: CreateLeadPayload,
    actor: ActorLabel,
  ): Promise<LeadDetail> {
    const leadNumber = await this.nextLeadNumber(organizationId);
    const now = new Date();
    const lineItems = (input.lineItems ?? []).map((line, i) => ({
      id: `li-${i + 1}`,
      productName: line.productName,
      sku: line.sku,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.quantity * line.unitPrice,
    }));
    const itemCount = lineItems.reduce((sum, l) => sum + l.quantity, 0);
    const productSummary =
      lineItems.length > 0
        ? lineItems.map((l) => `${l.productName} ×${l.quantity}`).join(', ')
        : null;

    const row = await this.prisma.lead.create({
      data: {
        organizationId,
        leadNumber,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim() || null,
        source: input.source,
        status: 'new',
        assignedAgentName: input.assignedAgentName?.trim() || actor.name || null,
        area: input.area?.trim() || null,
        address: input.address?.trim() || null,
        estimatedValue: input.estimatedValue ?? null,
        campaignName: input.campaignName?.trim() || null,
        notes: input.notes?.trim() || null,
        tags: input.tags ?? [],
        productSummary,
        itemCount: itemCount || null,
        lastActivityAt: now,
        lineItems: lineItems as unknown as Prisma.InputJsonValue,
        activities: [
          {
            id: `act-${leadNumber}-1`,
            type: 'created',
            label: 'Lead created',
            timestamp: now.toISOString(),
            actorName: actor.name,
          },
        ] as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toDetail(row);
  }

  async update(
    organizationId: string,
    idOrNumber: string,
    patch: {
      status?: LeadStatus;
      assignedAgentName?: string;
      notes?: string;
      tags?: string[];
      followUpDue?: string;
      address?: string;
      lineItems?: LeadDetail['lineItems'];
    },
    actor: ActorLabel,
  ): Promise<LeadDetail> {
    const existing = await this.prisma.lead.findFirst({
      where: {
        organizationId,
        OR: [{ id: idOrNumber }, { leadNumber: idOrNumber }],
      },
    });
    if (!existing) throw new NotFoundException('Lead not found');

    if (existing.status === 'converted' && patch.status && patch.status !== 'converted') {
      throw new BadRequestException('Converted leads cannot change status');
    }

    const activities = this.parseActivities(existing.activities);
    const now = new Date();
    if (patch.status && patch.status !== existing.status) {
      activities.push({
        id: `act-${existing.id}-${Date.now()}`,
        type: 'status_change',
        label: `Status → ${patch.status}`,
        timestamp: now.toISOString(),
        actorName: actor.name,
      });
    }
    if (patch.notes && patch.notes !== (existing.notes ?? '')) {
      activities.push({
        id: `act-${existing.id}-${Date.now()}-n`,
        type: 'note',
        label: 'Note updated',
        description: patch.notes,
        timestamp: now.toISOString(),
        actorName: actor.name,
      });
    }

    let lineItems = this.parseLineItems(existing.lineItems);
    let productSummary = existing.productSummary;
    let itemCount = existing.itemCount;
    if (patch.lineItems) {
      lineItems = patch.lineItems.map((l, i) => ({
        id: l.id || `li-${i + 1}`,
        productName: l.productName,
        sku: l.sku,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal ?? l.quantity * l.unitPrice,
      }));
      itemCount = lineItems.reduce((sum, l) => sum + l.quantity, 0);
      productSummary =
        lineItems.length > 0
          ? lineItems.map((l) => `${l.productName} ×${l.quantity}`).join(', ')
          : null;
    }

    const row = await this.prisma.lead.update({
      where: { id: existing.id },
      data: {
        status: patch.status ?? undefined,
        assignedAgentName:
          patch.assignedAgentName !== undefined
            ? patch.assignedAgentName.trim() || null
            : undefined,
        notes: patch.notes !== undefined ? patch.notes.trim() || null : undefined,
        tags: patch.tags,
        followUpDue:
          patch.followUpDue !== undefined
            ? patch.followUpDue
              ? new Date(patch.followUpDue)
              : null
            : undefined,
        address:
          patch.address !== undefined ? patch.address.trim() || null : undefined,
        lineItems: patch.lineItems
          ? (lineItems as unknown as Prisma.InputJsonValue)
          : undefined,
        productSummary: patch.lineItems ? productSummary : undefined,
        itemCount: patch.lineItems ? itemCount || null : undefined,
        lastActivityAt: now,
        activities: activities as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toDetail(row);
  }

  async bulkAction(
    organizationId: string,
    payload: {
      leadIds: string[];
      status?: LeadStatus;
      assignedAgentName?: string;
      note?: string;
      followUpDue?: string;
    },
    actor: ActorLabel,
  ): Promise<{ successCount: number; failedCount: number; message: string }> {
    let successCount = 0;
    for (const leadId of payload.leadIds) {
      try {
        const existing = await this.prisma.lead.findFirst({
          where: { organizationId, id: leadId },
        });
        if (!existing) continue;
        const notes = payload.note
          ? existing.notes
            ? `${existing.notes}\n${payload.note}`
            : payload.note
          : undefined;
        await this.update(
          organizationId,
          leadId,
          {
            status: payload.status,
            assignedAgentName: payload.assignedAgentName,
            notes,
            followUpDue: payload.followUpDue,
          },
          actor,
        );
        successCount += 1;
      } catch {
        // count as failed
      }
    }
    const failedCount = payload.leadIds.length - successCount;
    return {
      successCount,
      failedCount,
      message: `Updated ${successCount} lead(s)`,
    };
  }

  async getConvertPrefill(
    organizationId: string,
    idOrNumber: string,
  ): Promise<LeadConvertPrefill> {
    const lead = await this.getByIdOrNumber(organizationId, idOrNumber);
    if (lead.status === 'converted') {
      throw new BadRequestException('Lead already converted');
    }
    if (lead.status === 'lost') {
      throw new BadRequestException('Lost leads cannot be converted');
    }

    const lineItems = lead.lineItems.map((line) => ({
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      sku: line.sku,
      productId: (line as LeadLineJson).productId,
      variantId: (line as LeadLineJson).variantId,
      variationLabel: (line as LeadLineJson).variationLabel,
    }));

    return {
      leadId: lead.id,
      leadNumber: lead.leadNumber,
      customerName: lead.name,
      customerPhone: lead.phone,
      customerEmail: lead.email,
      shippingAddress: lead.address,
      shippingArea: lead.area,
      source: lead.source,
      orderSource: lead.source,
      lineItems: lineItems.length > 0 ? lineItems : undefined,
    };
  }

  async markConverted(
    organizationId: string,
    leadId: string,
    orderNumber: string,
    actor?: ActorLabel,
  ): Promise<LeadDetail | null> {
    const existing = await this.prisma.lead.findFirst({
      where: { organizationId, id: leadId },
    });
    if (!existing) return null;
    if (existing.status === 'converted') {
      return this.toDetail(existing);
    }

    const now = new Date();
    const activities = this.parseActivities(existing.activities);
    activities.push({
      id: `act-${existing.id}-converted`,
      type: 'converted',
      label: 'Converted to order',
      description: orderNumber,
      timestamp: now.toISOString(),
      actorName: actor?.name,
    });

    const row = await this.prisma.lead.update({
      where: { id: existing.id },
      data: {
        status: 'converted',
        orderId: orderNumber,
        convertedAt: now,
        lastActivityAt: now,
        activities: activities as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toDetail(row);
  }

  private async nextLeadNumber(organizationId: string): Promise<string> {
    const latest = await this.prisma.lead.findFirst({
      where: { organizationId, leadNumber: { startsWith: 'LD-' } },
      orderBy: { leadNumber: 'desc' },
      select: { leadNumber: true },
    });
    const match = latest?.leadNumber.match(/^LD-(\d+)$/);
    const next = match ? Number(match[1]) + 1 : 2001;
    return `LD-${next}`;
  }

  private parseLineItems(value: unknown): LeadLineItem[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((raw, i) => {
      const item = raw as LeadLineJson;
      if (!item?.productName) return [];
      const quantity = Number(item.quantity) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      return [
        {
          id: item.id || `li-${i + 1}`,
          productName: String(item.productName),
          sku: item.sku ? String(item.sku) : undefined,
          quantity,
          unitPrice,
          lineTotal: Number(item.lineTotal) || quantity * unitPrice,
        } satisfies LeadLineItem,
      ];
    });
  }

  private parseActivities(value: unknown): LeadActivity[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((raw, i) => {
      const item = raw as LeadActivity;
      if (!item?.type || !item?.label || !item?.timestamp) return [];
      return [
        {
          id: item.id || `act-${i + 1}`,
          type: item.type,
          label: item.label,
          description: item.description,
          timestamp: item.timestamp,
          actorName: item.actorName,
        } satisfies LeadActivity,
      ];
    });
  }

  private toListItem(row: Lead): LeadDetail {
    return this.toDetail(row);
  }

  private toDetail(row: Lead): LeadDetail {
    const lineItems = this.parseLineItems(row.lineItems);
    const activities = this.parseActivities(row.activities);
    return {
      id: row.id,
      leadNumber: row.leadNumber,
      name: row.name,
      phone: row.phone,
      email: row.email ?? undefined,
      source: row.source as OrderSource,
      status: (LEAD_STATUSES.includes(row.status as LeadStatus)
        ? row.status
        : 'new') as LeadStatus,
      assignedAgentName: row.assignedAgentName ?? undefined,
      area: row.area ?? undefined,
      address: row.address ?? undefined,
      estimatedValue: row.estimatedValue ?? undefined,
      campaignName: row.campaignName ?? undefined,
      notes: row.notes ?? undefined,
      tags: row.tags ?? [],
      productSummary: row.productSummary ?? undefined,
      itemCount: row.itemCount ?? undefined,
      followUpDue: row.followUpDue?.toISOString(),
      orderId: row.orderId ?? undefined,
      convertedAt: row.convertedAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      lastActivityAt: (row.lastActivityAt ?? row.updatedAt).toISOString(),
      hasNotes: Boolean(row.notes?.trim()),
      lineItems,
      activities,
    };
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Campaign,
  CampaignOverview,
  CampaignPlatform,
  CampaignStatus,
  CreateCampaignPayload,
  UpdateCampaignPayload,
} from '@laam/types';
import type { Campaign as CampaignRow, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
  }

  async overview(organizationId: string): Promise<CampaignOverview> {
    const rows = await this.prisma.campaign.findMany({
      where: { organizationId },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    });

    const names = rows.map((r) => r.name);
    const nameKeys = names.map((n) => n.trim().toLowerCase());

    const [spends, orders, leads] = await Promise.all([
      this.prisma.marketingSpend.findMany({
        where: { organizationId },
        select: { campaignName: true, spendBdt: true },
      }),
      this.prisma.order.findMany({
        where: {
          organizationId,
          deletedAt: null,
          status: { notIn: ['cancelled'] },
          ...(names.length
            ? {
                OR: names.map((n) => ({
                  utmCampaign: { equals: n, mode: 'insensitive' as const },
                })),
              }
            : { id: '__none__' }),
        },
        select: {
          utmCampaign: true,
          amount: true,
          status: true,
        },
      }),
      this.prisma.lead.findMany({
        where: {
          organizationId,
          ...(names.length
            ? {
                OR: names.map((n) => ({
                  campaignName: { equals: n, mode: 'insensitive' as const },
                })),
              }
            : { id: '__none__' }),
        },
        select: { campaignName: true },
      }),
    ]);

    const spendByName = new Map<string, number>();
    for (const s of spends) {
      const key = s.campaignName.trim().toLowerCase();
      spendByName.set(key, (spendByName.get(key) ?? 0) + s.spendBdt);
    }

    const metricsByName = new Map<string, { revenue: number; orders: number; leads: number }>();
    for (const key of nameKeys) {
      metricsByName.set(key, { revenue: 0, orders: 0, leads: 0 });
    }

    for (const o of orders) {
      const key = o.utmCampaign?.trim().toLowerCase();
      if (!key || !metricsByName.has(key)) continue;
      const m = metricsByName.get(key)!;
      m.orders += 1;
      m.revenue += o.amount || 0;
    }

    for (const l of leads) {
      const key = l.campaignName?.trim().toLowerCase();
      if (!key || !metricsByName.has(key)) continue;
      metricsByName.get(key)!.leads += 1;
    }

    const campaigns = rows.map((row) =>
      this.toCampaign(
        row,
        spendByName.get(row.name.trim().toLowerCase()) ?? 0,
        metricsByName.get(row.name.trim().toLowerCase()) ?? {
          revenue: 0,
          orders: 0,
          leads: 0,
        },
      ),
    );

    const totalSpendBdt = campaigns.reduce((s, c) => s + c.spendBdt, 0);
    const totalRevenueBdt = campaigns.reduce((s, c) => s + c.revenueBdt, 0);
    const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);

    const landingPages = rows
      .filter((r) => r.landingPageUrl?.trim())
      .map((r) => {
        const m = metricsByName.get(r.name.trim().toLowerCase());
        const conversions = m?.orders ?? 0;
        return {
          id: r.id,
          name: r.landingPageName?.trim() || r.name,
          url: r.landingPageUrl!.trim(),
          visits: 0,
          conversions,
          conversionRate: 0,
        };
      });

    return {
      campaigns,
      totalSpendBdt,
      totalRevenueBdt,
      avgRoas:
        totalSpendBdt > 0
          ? Math.round((totalRevenueBdt / totalSpendBdt) * 100) / 100
          : 0,
      totalLeads,
      landingPages,
    };
  }

  async list(organizationId: string): Promise<Campaign[]> {
    const overview = await this.overview(organizationId);
    return overview.campaigns;
  }

  async getById(organizationId: string, id: string): Promise<Campaign> {
    const row = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Campaign not found');
    const overview = await this.overview(organizationId);
    const found = overview.campaigns.find((c) => c.id === id);
    if (!found) throw new NotFoundException('Campaign not found');
    return found;
  }

  async create(
    organizationId: string,
    input: CreateCampaignPayload,
  ): Promise<Campaign> {
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('Name is required');

    const existing = await this.prisma.campaign.findFirst({
      where: { organizationId, name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('A campaign with this name already exists');
    }

    const startDate = this.parseDateOnly(input.startDate) ?? this.todayDateOnly();
    const row = await this.prisma.campaign.create({
      data: {
        organizationId,
        name,
        status: input.status ?? 'active',
        platform: input.platform ?? 'facebook',
        budgetBdt: input.budgetBdt ?? 0,
        startDate,
        endDate: this.parseDateOnly(input.endDate ?? undefined),
        notes: input.notes?.trim() || null,
        landingPageName: input.landingPageName?.trim() || null,
        landingPageUrl: input.landingPageUrl?.trim() || null,
      },
    });

    return this.toCampaign(row, 0, { revenue: 0, orders: 0, leads: 0 });
  }

  async update(
    organizationId: string,
    id: string,
    patch: UpdateCampaignPayload,
  ): Promise<Campaign> {
    const existing = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Campaign not found');

    const data: Prisma.CampaignUpdateInput = {};

    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) throw new BadRequestException('Name cannot be empty');
      const clash = await this.prisma.campaign.findFirst({
        where: {
          organizationId,
          id: { not: id },
          name: { equals: name, mode: 'insensitive' },
        },
      });
      if (clash) {
        throw new ConflictException('A campaign with this name already exists');
      }
      data.name = name;
    }
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.platform !== undefined) data.platform = patch.platform;
    if (patch.budgetBdt !== undefined) {
      if (patch.budgetBdt < 0) throw new BadRequestException('Budget cannot be negative');
      data.budgetBdt = patch.budgetBdt;
    }
    if (patch.startDate !== undefined) {
      data.startDate = this.parseDateOnly(patch.startDate) ?? existing.startDate;
    }
    if (patch.endDate !== undefined) {
      data.endDate = this.parseDateOnly(patch.endDate);
    }
    if (patch.notes !== undefined) data.notes = patch.notes?.trim() || null;
    if (patch.landingPageName !== undefined) {
      data.landingPageName = patch.landingPageName?.trim() || null;
    }
    if (patch.landingPageUrl !== undefined) {
      data.landingPageUrl = patch.landingPageUrl?.trim() || null;
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data,
    });

    return this.getById(organizationId, updated.id);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const existing = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Campaign not found');
    await this.prisma.campaign.delete({ where: { id } });
  }

  private toCampaign(
    row: CampaignRow,
    spendBdt: number,
    metrics: { revenue: number; orders: number; leads: number },
  ): Campaign {
    const roas =
      spendBdt > 0 ? Math.round((metrics.revenue / spendBdt) * 100) / 100 : 0;
    return {
      id: row.id,
      name: row.name,
      status: row.status as CampaignStatus,
      platform: row.platform as CampaignPlatform,
      spendBdt,
      budgetBdt: row.budgetBdt,
      leads: metrics.leads,
      orders: metrics.orders,
      revenueBdt: metrics.revenue,
      roas,
      startDate: this.toDateString(row.startDate),
      endDate: row.endDate ? this.toDateString(row.endDate) : undefined,
      notes: row.notes ?? undefined,
      landingPageName: row.landingPageName ?? undefined,
      landingPageUrl: row.landingPageUrl ?? undefined,
    };
  }

  private parseDateOnly(value?: string | null): Date | null {
    if (value === null) return null;
    if (!value?.trim()) return null;
    const d = new Date(`${value.trim().slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    return d;
  }

  private toDateString(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private todayDateOnly(): Date {
    const n = new Date();
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
  }
}

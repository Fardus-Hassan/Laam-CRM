import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import type {
  ChartPoint,
  EmployeeMetricRow,
  LeadSourceRow,
  LoginHistoryRow,
  MarketingReport,
  MarketingSpendRow,
  RankedProductRow,
  RepeatCustomerRow,
  ReportKpi,
  ReportPeriod,
  ReportSummary,
  ReportViewId,
  TeamTargetRow,
  UpsellRow,
} from '@laam/types';

import { PrismaService } from '../prisma/prisma.service';
import { summarizeUserAgent } from '../auth/user-agent.util';

/** Statuses that count as successful delivery for revenue KPIs. */
const DELIVERED = new Set(['delivered', 'completed', 'partial_delivered']);
const CANCELLED = new Set(['cancelled']);
const CONFIRMED = new Set([
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'in_transit',
  'delivered',
  'completed',
  'partial_delivered',
]);

type OrderRow = {
  id: string;
  status: string;
  amount: number;
  paidAmount: number;
  paymentMethod: string | null;
  paymentStatus: string;
  source: string;
  assignedAgentName: string | null;
  orderDate: Date;
  createdAt: Date;
  customerId: string | null;
  itemsCount: number;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
  }

  resolveRange(period: ReportPeriod): { from: Date; to: Date; period: ReportPeriod } {
    const to = new Date();
    const from = new Date(to);
    switch (period) {
      case '7d':
        from.setDate(from.getDate() - 7);
        break;
      case '90d':
        from.setDate(from.getDate() - 90);
        break;
      case 'ytd':
        from.setMonth(0, 1);
        from.setHours(0, 0, 0, 0);
        break;
      case 'custom':
      case '30d':
      default:
        from.setDate(from.getDate() - 30);
        break;
    }
    return { from, to, period: period === 'custom' ? '30d' : period };
  }

  async getSummary(
    organizationId: string,
    period: ReportPeriod,
  ): Promise<ReportSummary> {
    const range = this.resolveRange(period);
    const orders = await this.loadOrders(organizationId, range.from, range.to);
    const previous = await this.loadOrders(
      organizationId,
      new Date(range.from.getTime() - (range.to.getTime() - range.from.getTime())),
      range.from,
    );

    const active = orders.filter((o) => !CANCELLED.has(o.status));
    const prevActive = previous.filter((o) => !CANCELLED.has(o.status));
    const revenue = active.reduce((s, o) => s + o.amount, 0);
    const prevRevenue = prevActive.reduce((s, o) => s + o.amount, 0);
    const confirmed = orders.filter((o) => CONFIRMED.has(o.status)).length;
    const confirmRate =
      orders.length > 0 ? Math.round((confirmed / orders.length) * 1000) / 10 : 0;

    const leads = await this.prisma.lead.count({
      where: {
        organizationId,
        createdAt: { gte: range.from, lte: range.to },
      },
    });
    const converted = await this.prisma.lead.count({
      where: {
        organizationId,
        createdAt: { gte: range.from, lte: range.to },
        status: 'converted',
      },
    });
    const conversion =
      leads > 0 ? Math.round((converted / leads) * 1000) / 10 : 0;

    const multiItem = active.filter((o) => o.itemsCount > 1).length;
    const attachRate =
      active.length > 0 ? Math.round((multiItem / active.length) * 1000) / 10 : 0;

    const topProducts = await this.rankSoldProducts(organizationId, range.from, range.to, 5);
    const topProduct = topProducts[0];
    const agentRows = this.aggregateAgents(orders);
    const topAgent = agentRows[0];

    const revenueTrend = this.dailyTrend(active, range.from, range.to, (o) => o.amount);
    const ordersTrend = this.dailyTrend(active, range.from, range.to, () => 1);

    const bestDay = [...revenueTrend].sort((a, b) => b.value - a.value)[0];

    return {
      period: range.period,
      kpis: [
        {
          id: 'orders',
          label: 'Total orders',
          value: String(orders.length),
          change: this.pctChange(orders.length, previous.length),
          hint: 'vs previous period',
        },
        {
          id: 'revenue',
          label: 'Booked revenue',
          value: this.money(revenue),
          change: this.pctChange(revenue, prevRevenue),
          hint: 'Non-cancelled order value',
        },
        {
          id: 'confirm',
          label: 'Confirm rate',
          value: `${confirmRate}%`,
          hint: 'Confirmed / total orders',
        },
        {
          id: 'conversion',
          label: 'Lead conversion',
          value: `${conversion}%`,
          hint: `${converted} of ${leads} leads`,
        },
        {
          id: 'attach',
          label: 'Multi-item rate',
          value: `${attachRate}%`,
          hint: 'Orders with 2+ line items',
        },
        {
          id: 'collected',
          label: 'Collected',
          value: this.money(active.reduce((s, o) => s + (o.paidAmount || 0), 0)),
          hint: 'paidAmount sum',
        },
      ],
      revenueTrend,
      ordersTrend,
      topProducts: topProducts.map((p) => ({
        id: p.id,
        name: p.name,
        units: p.value,
        revenueBdt: p.secondaryValue ?? 0,
      })),
      recentHighlights: [
        {
          id: 'h1',
          label: 'Best day',
          value: bestDay
            ? `${bestDay.label} — ${this.money(bestDay.value)}`
            : 'No sales in period',
        },
        {
          id: 'h2',
          label: 'Top agent',
          value: topAgent
            ? `${topAgent.name} — ${topAgent.orders} orders`
            : 'No agent data',
        },
        {
          id: 'h3',
          label: 'Top product',
          value: topProduct
            ? `${topProduct.name} — ${topProduct.value} units`
            : 'No product sales',
        },
      ],
    };
  }

  async getSales(
    organizationId: string,
    period: ReportPeriod,
  ): Promise<{ kpis: ReportKpi[]; trend: ChartPoint[] }> {
    const range = this.resolveRange(period);
    const orders = await this.loadOrders(organizationId, range.from, range.to);
    const active = orders.filter((o) => !CANCELLED.has(o.status));
    const confirmed = orders.filter((o) => CONFIRMED.has(o.status)).length;
    const delivered = orders.filter((o) => DELIVERED.has(o.status)).length;
    const cancelled = orders.filter((o) => CANCELLED.has(o.status)).length;
    const returned = orders.filter((o) =>
      ['returned', 'pending_return', 'failed'].includes(o.status),
    ).length;
    const aov =
      active.length > 0
        ? Math.round(active.reduce((s, o) => s + o.amount, 0) / active.length)
        : 0;
    const codCount = orders.filter(
      (o) =>
        (o.paymentMethod ?? '').toLowerCase() === 'cod' ||
        o.paymentStatus === 'cod',
    ).length;
    const codPct =
      orders.length > 0 ? Math.round((codCount / orders.length) * 1000) / 10 : 0;
    const multiItem = active.filter((o) => o.itemsCount > 1).length;
    const attach =
      active.length > 0 ? Math.round((multiItem / active.length) * 1000) / 10 : 0;

    return {
      kpis: [
        { id: 'orders', label: 'Orders', value: String(orders.length) },
        { id: 'confirmed', label: 'Confirmed', value: String(confirmed) },
        { id: 'delivered', label: 'Delivered', value: String(delivered) },
        { id: 'cancelled', label: 'Cancelled', value: String(cancelled) },
        { id: 'returned', label: 'Returned/failed', value: String(returned) },
        { id: 'aov', label: 'AOV', value: this.money(aov) },
        { id: 'cod', label: 'COD %', value: `${codPct}%` },
        { id: 'attach', label: 'Multi-item rate', value: `${attach}%` },
      ],
      trend: this.dailyTrend(orders, range.from, range.to, () => 1),
    };
  }

  async getRevenue(
    organizationId: string,
    period: ReportPeriod,
  ): Promise<{ kpis: ReportKpi[]; trend: ChartPoint[]; breakdown: ChartPoint[] }> {
    const range = this.resolveRange(period);
    const orders = await this.loadOrders(organizationId, range.from, range.to);
    const active = orders.filter((o) => !CANCELLED.has(o.status));
    const total = active.reduce((s, o) => s + o.amount, 0);
    const collected = active.reduce((s, o) => s + (o.paidAmount || 0), 0);
    const pending = Math.max(0, total - collected);

    const prepaid = active
      .filter((o) => {
        const m = (o.paymentMethod ?? '').toLowerCase();
        return m === 'bkash' || m === 'nagad' || m === 'bank' || m === 'card';
      })
      .reduce((s, o) => s + (o.paidAmount || o.amount), 0);
    const codCollected = active
      .filter((o) => {
        const m = (o.paymentMethod ?? '').toLowerCase();
        return m === 'cod' || m === 'cash' || !m || o.paymentStatus === 'cod';
      })
      .reduce((s, o) => s + (o.paidAmount || 0), 0);

    const breakdown = await this.revenueByCategory(
      organizationId,
      range.from,
      range.to,
    );

    return {
      kpis: [
        { id: 'total', label: 'Total revenue', value: this.money(total) },
        { id: 'cod', label: 'COD collected', value: this.money(codCollected) },
        { id: 'prepaid', label: 'Prepaid collected', value: this.money(prepaid) },
        { id: 'pending', label: 'Pending collection', value: this.money(pending) },
      ],
      trend: this.dailyTrend(active, range.from, range.to, (o) => o.amount),
      breakdown,
    };
  }

  async getRepeatCustomers(
    organizationId: string,
    period: ReportPeriod,
  ): Promise<RepeatCustomerRow[]> {
    const range = this.resolveRange(period);
    const customers = await this.prisma.customer.findMany({
      where: {
        organizationId,
        orderCount: { gte: 2 },
        OR: [
          { lastOrderAt: { gte: range.from, lte: range.to } },
          { updatedAt: { gte: range.from, lte: range.to } },
        ],
      },
      orderBy: { totalSpent: 'desc' },
      take: 100,
    });

    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      mobile: c.phone,
      orderCount: c.orderCount,
      totalSpentBdt: Number(c.totalSpent) || 0,
      lastOrderDate: (c.lastOrderAt ?? c.updatedAt).toISOString(),
    }));
  }

  async getRankedProducts(
    organizationId: string,
    type: ReportViewId,
    period: ReportPeriod,
  ): Promise<RankedProductRow[]> {
    const range = this.resolveRange(period);

    switch (type) {
      case 'top-return':
        return this.rankReturnedProducts(organizationId, range.from, range.to);
      case 'top-purchased':
        return this.rankPurchasedProducts(organizationId, range.from, range.to);
      case 'low-stock':
        return this.rankStock(organizationId, 'asc');
      case 'high-stock':
        return this.rankStock(organizationId, 'desc');
      case 'product-sales':
      case 'top-sold':
      default:
        return this.rankSoldProducts(organizationId, range.from, range.to, 50);
    }
  }

  async getProductDaily(
    organizationId: string,
    period: ReportPeriod,
  ): Promise<ChartPoint[]> {
    const range = this.resolveRange(period);
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          organizationId,
          deletedAt: null,
          orderDate: { gte: range.from, lte: range.to },
          status: { notIn: [...CANCELLED] },
        },
      },
      select: {
        quantity: true,
        order: { select: { orderDate: true } },
      },
    });

    const map = new Map<string, number>();
    for (const item of items) {
      const key = item.order.orderDate.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + item.quantity);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label: label.slice(5), value }));
  }

  async getEmployees(
    organizationId: string,
    type: ReportViewId,
    period: ReportPeriod,
  ): Promise<EmployeeMetricRow[]> {
    const range = this.resolveRange(period);
    const orders = await this.loadOrders(organizationId, range.from, range.to);

    if (type === 'employee-activity') {
      const activities = await this.prisma.orderActivity.groupBy({
        by: ['actorName'],
        where: {
          order: { organizationId, deletedAt: null },
          createdAt: { gte: range.from, lte: range.to },
          actorName: { not: null },
        },
        _count: { _all: true },
      });
      const byAgent = this.aggregateAgents(orders);
      const activityMap = new Map(
        activities
          .filter((a) => a.actorName)
          .map((a) => [a.actorName!, a._count._all]),
      );
      return byAgent.map((row) => ({
        ...row,
        activities: activityMap.get(row.name) ?? 0,
      }));
    }

    if (type === 'teams') {
      const users = await this.prisma.user.findMany({
        where: { organizationId, status: { not: 'suspended' } },
        select: { name: true, team: { select: { id: true, name: true } } },
      });
      const agents = this.aggregateAgents(orders);
      const teamMap = new Map<string, EmployeeMetricRow>();
      for (const agent of agents) {
        const user = users.find(
          (u) => u.name?.toLowerCase() === agent.name.toLowerCase(),
        );
        const teamName = user?.team?.name ?? 'Unassigned';
        const teamId = user?.team?.id ?? 'unassigned';
        const existing = teamMap.get(teamId);
        if (!existing) {
          teamMap.set(teamId, {
            id: teamId,
            name: teamName,
            role: 'Team',
            orders: agent.orders,
            revenueBdt: agent.revenueBdt,
            avgOrderValue: agent.avgOrderValue,
          });
        } else {
          existing.orders += agent.orders;
          existing.revenueBdt += agent.revenueBdt;
          existing.avgOrderValue =
            existing.orders > 0
              ? Math.round(existing.revenueBdt / existing.orders)
              : 0;
        }
      }
      return [...teamMap.values()].sort((a, b) => b.revenueBdt - a.revenueBdt);
    }

    return this.aggregateAgents(orders);
  }

  async getTeamTargets(
    organizationId: string,
    period: ReportPeriod,
  ): Promise<TeamTargetRow[]> {
    const range = this.resolveRange(period);
    const monthKey = this.monthKey(range.to);
    const monthRange = this.monthBounds(monthKey);

    const monthOrders = await this.loadOrders(
      organizationId,
      monthRange.from,
      monthRange.to,
    );
    const [targets, teamActuals] = await Promise.all([
      this.prisma.performanceTarget.findMany({
        where: { organizationId, monthKey },
      }),
      this.computeTeamActuals(organizationId, monthRange.from, monthRange.to),
    ]);
    const agentActuals = this.aggregateAgents(monthOrders);

    const rows: TeamTargetRow[] = [];

    for (const t of targets) {
      if (t.scope === 'agent') {
        const actual =
          agentActuals.find(
            (a) => a.name.toLowerCase() === t.subjectKey.toLowerCase(),
          ) ??
          agentActuals.find(
            (a) => a.name.toLowerCase() === t.subjectLabel.toLowerCase(),
          );
        const actualOrders = actual?.orders ?? 0;
        const actualRevenue = actual?.revenueBdt ?? 0;
        rows.push({
          id: t.id,
          name: `${t.subjectLabel} (Agent)`,
          targetOrders: t.targetOrders,
          actualOrders,
          targetRevenueBdt: t.targetRevenueBdt,
          actualRevenueBdt: actualRevenue,
          progressPercent: this.targetProgress(
            t.targetOrders,
            t.targetRevenueBdt,
            actualOrders,
            actualRevenue,
          ),
        });
      } else {
        const actual =
          teamActuals.find((a) => a.id === t.subjectKey) ??
          teamActuals.find(
            (a) => a.name.toLowerCase() === t.subjectLabel.toLowerCase(),
          );
        const actualOrders = actual?.orders ?? 0;
        const actualRevenue = actual?.revenueBdt ?? 0;
        rows.push({
          id: t.id,
          name: `${t.subjectLabel} (Team)`,
          targetOrders: t.targetOrders,
          actualOrders,
          targetRevenueBdt: t.targetRevenueBdt,
          actualRevenueBdt: actualRevenue,
          progressPercent: this.targetProgress(
            t.targetOrders,
            t.targetRevenueBdt,
            actualOrders,
            actualRevenue,
          ),
        });
      }
    }

    // Include agents/teams with actuals but no target yet
    for (const a of agentActuals) {
      if (
        rows.some(
          (r) =>
            r.name.toLowerCase().startsWith(a.name.toLowerCase()) &&
            r.name.includes('(Agent)'),
        )
      ) {
        continue;
      }
      rows.push({
        id: `actual_agent_${a.id}`,
        name: `${a.name} (Agent)`,
        targetOrders: 0,
        actualOrders: a.orders,
        targetRevenueBdt: 0,
        actualRevenueBdt: a.revenueBdt,
        progressPercent: 0,
      });
    }
    for (const t of teamActuals) {
      if (
        rows.some(
          (r) =>
            r.name.toLowerCase().startsWith(t.name.toLowerCase()) &&
            r.name.includes('(Team)'),
        )
      ) {
        continue;
      }
      rows.push({
        id: `actual_team_${t.id}`,
        name: `${t.name} (Team)`,
        targetOrders: 0,
        actualOrders: t.orders,
        targetRevenueBdt: 0,
        actualRevenueBdt: t.revenueBdt,
        progressPercent: 0,
      });
    }

    return rows.sort((a, b) => b.actualRevenueBdt - a.actualRevenueBdt);
  }

  async getMarketing(
    organizationId: string,
    period: ReportPeriod,
  ): Promise<MarketingReport> {
    const range = this.resolveRange(period);
    const monthKeys = this.monthKeysInRange(range.from, range.to);
    const orders = await this.prisma.order.findMany({
      where: {
        organizationId,
        deletedAt: null,
        orderDate: { gte: range.from, lte: range.to },
        status: { notIn: [...CANCELLED] },
      },
      select: {
        amount: true,
        utmCampaign: true,
        orderDate: true,
      },
    });
    const leads = await this.prisma.lead.count({
      where: {
        organizationId,
        createdAt: { gte: range.from, lte: range.to },
      },
    });

    const spends = await this.prisma.marketingSpend.findMany({
      where: { organizationId, monthKey: { in: monthKeys } },
    });
    const spendByCampaign = new Map<string, number>();
    for (const s of spends) {
      const key = s.campaignName.trim().toLowerCase();
      spendByCampaign.set(key, (spendByCampaign.get(key) ?? 0) + s.spendBdt);
    }

    const byCampaign = new Map<string, { revenue: number; orders: number }>();
    for (const o of orders) {
      const name = o.utmCampaign?.trim() || 'Unattributed';
      const cur = byCampaign.get(name) ?? { revenue: 0, orders: 0 };
      cur.revenue += o.amount;
      cur.orders += 1;
      byCampaign.set(name, cur);
    }

    // Include spend-only campaigns with no attributed orders
    for (const s of spends) {
      if (![...byCampaign.keys()].some((k) => k.toLowerCase() === s.campaignName.trim().toLowerCase())) {
        byCampaign.set(s.campaignName.trim(), { revenue: 0, orders: 0 });
      }
    }

    const revenueBdt = orders.reduce((s, o) => s + o.amount, 0);
    const spendBdt = spends.reduce((s, x) => s + x.spendBdt, 0);
    const campaigns = [...byCampaign.entries()]
      .map(([name, v], i) => {
        const spend = spendByCampaign.get(name.toLowerCase()) ?? 0;
        return {
          id: `camp_${i}`,
          name,
          spendBdt: Math.round(spend),
          revenueBdt: Math.round(v.revenue),
          roas: spend > 0 ? Math.round((v.revenue / spend) * 100) / 100 : 0,
          orders: v.orders,
        };
      })
      .sort((a, b) => b.revenueBdt - a.revenueBdt)
      .slice(0, 30);

    const trendMap = new Map<string, number>();
    for (const o of orders) {
      const key = o.orderDate.toISOString().slice(0, 10);
      trendMap.set(key, (trendMap.get(key) ?? 0) + o.amount);
    }
    const trend = [...trendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([label, bar]) => ({
        label: label.slice(5),
        bar: Math.round(bar),
        line: 0,
      }));

    return {
      spendBdt: Math.round(spendBdt),
      revenueBdt: Math.round(revenueBdt),
      roas: spendBdt > 0 ? Math.round((revenueBdt / spendBdt) * 100) / 100 : 0,
      leads,
      orders: orders.length,
      trend,
      campaigns,
    };
  }

  async listMarketingSpend(
    organizationId: string,
    monthKey?: string,
  ): Promise<MarketingSpendRow[]> {
    const key = monthKey || this.monthKey(new Date());
    const rows = await this.prisma.marketingSpend.findMany({
      where: { organizationId, monthKey: key },
      orderBy: { campaignName: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      monthKey: r.monthKey,
      campaignName: r.campaignName,
      spendBdt: r.spendBdt,
      notes: r.notes ?? undefined,
    }));
  }

  async upsertMarketingSpend(
    organizationId: string,
    input: {
      monthKey: string;
      campaignName: string;
      spendBdt: number;
      notes?: string;
    },
  ): Promise<MarketingSpendRow> {
    const campaignName = input.campaignName.trim();
    if (!campaignName) throw new BadRequestException('Campaign name required');
    if (!(input.spendBdt >= 0)) throw new BadRequestException('Spend must be >= 0');
    if (!/^\d{4}-\d{2}$/.test(input.monthKey)) {
      throw new BadRequestException('monthKey must be YYYY-MM');
    }

    const row = await this.prisma.marketingSpend.upsert({
      where: {
        organizationId_monthKey_campaignName: {
          organizationId,
          monthKey: input.monthKey,
          campaignName,
        },
      },
      create: {
        organizationId,
        monthKey: input.monthKey,
        campaignName,
        spendBdt: input.spendBdt,
        notes: input.notes?.trim() || null,
      },
      update: {
        spendBdt: input.spendBdt,
        notes: input.notes?.trim() || null,
      },
    });
    return {
      id: row.id,
      monthKey: row.monthKey,
      campaignName: row.campaignName,
      spendBdt: row.spendBdt,
      notes: row.notes ?? undefined,
    };
  }

  async deleteMarketingSpend(organizationId: string, id: string): Promise<void> {
    const existing = await this.prisma.marketingSpend.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new BadRequestException('Spend entry not found');
    await this.prisma.marketingSpend.delete({ where: { id } });
  }

  async listTargets(
    organizationId: string,
    monthKey?: string,
  ): Promise<
    Array<{
      id: string;
      monthKey: string;
      scope: 'agent' | 'team';
      subjectKey: string;
      subjectLabel: string;
      targetOrders: number;
      targetRevenueBdt: number;
    }>
  > {
    const key = monthKey || this.monthKey(new Date());
    const rows = await this.prisma.performanceTarget.findMany({
      where: { organizationId, monthKey: key },
      orderBy: [{ scope: 'asc' }, { subjectLabel: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      monthKey: r.monthKey,
      scope: r.scope as 'agent' | 'team',
      subjectKey: r.subjectKey,
      subjectLabel: r.subjectLabel,
      targetOrders: r.targetOrders,
      targetRevenueBdt: r.targetRevenueBdt,
    }));
  }

  async upsertTarget(
    organizationId: string,
    input: {
      monthKey: string;
      scope: 'agent' | 'team';
      subjectKey: string;
      subjectLabel: string;
      targetOrders: number;
      targetRevenueBdt: number;
    },
  ) {
    if (!/^\d{4}-\d{2}$/.test(input.monthKey)) {
      throw new BadRequestException('monthKey must be YYYY-MM');
    }
    const subjectKey = input.subjectKey.trim();
    const subjectLabel = input.subjectLabel.trim();
    if (!subjectKey || !subjectLabel) {
      throw new BadRequestException('Subject key and label required');
    }

    const row = await this.prisma.performanceTarget.upsert({
      where: {
        organizationId_monthKey_scope_subjectKey: {
          organizationId,
          monthKey: input.monthKey,
          scope: input.scope,
          subjectKey,
        },
      },
      create: {
        organizationId,
        monthKey: input.monthKey,
        scope: input.scope,
        subjectKey,
        subjectLabel,
        targetOrders: input.targetOrders,
        targetRevenueBdt: input.targetRevenueBdt,
      },
      update: {
        subjectLabel,
        targetOrders: input.targetOrders,
        targetRevenueBdt: input.targetRevenueBdt,
      },
    });
    return {
      id: row.id,
      monthKey: row.monthKey,
      scope: row.scope as 'agent' | 'team',
      subjectKey: row.subjectKey,
      subjectLabel: row.subjectLabel,
      targetOrders: row.targetOrders,
      targetRevenueBdt: row.targetRevenueBdt,
    };
  }

  async deleteTarget(organizationId: string, id: string): Promise<void> {
    const existing = await this.prisma.performanceTarget.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new BadRequestException('Target not found');
    await this.prisma.performanceTarget.delete({ where: { id } });
  }

  async getLeadSources(
    organizationId: string,
    period: ReportPeriod,
  ): Promise<LeadSourceRow[]> {
    const range = this.resolveRange(period);
    const [leads, orders] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['source'],
        where: {
          organizationId,
          createdAt: { gte: range.from, lte: range.to },
        },
        _count: { _all: true },
      }),
      this.loadOrders(organizationId, range.from, range.to),
    ]);

    const leadMap = new Map(leads.map((l) => [l.source || 'unknown', l._count._all]));
    const orderBySource = new Map<string, { orders: number; revenue: number }>();
    for (const o of orders.filter((x) => !CANCELLED.has(x.status))) {
      const src = o.source || 'unknown';
      const cur = orderBySource.get(src) ?? { orders: 0, revenue: 0 };
      cur.orders += 1;
      cur.revenue += o.amount;
      orderBySource.set(src, cur);
    }

    const sources = new Set([...leadMap.keys(), ...orderBySource.keys()]);
    return [...sources]
      .map((source) => {
        const leadCount = leadMap.get(source) ?? 0;
        const ord = orderBySource.get(source) ?? { orders: 0, revenue: 0 };
        return {
          source,
          leads: leadCount,
          orders: ord.orders,
          conversionRate:
            leadCount > 0
              ? Math.round((ord.orders / leadCount) * 1000) / 10
              : ord.orders > 0
                ? 100
                : 0,
          revenueBdt: Math.round(ord.revenue),
        };
      })
      .sort((a, b) => b.revenueBdt - a.revenueBdt);
  }

  async getUpsales(
    organizationId: string,
    period: ReportPeriod,
  ): Promise<UpsellRow[]> {
    const range = this.resolveRange(period);
    const orders = await this.prisma.order.findMany({
      where: {
        organizationId,
        deletedAt: null,
        orderDate: { gte: range.from, lte: range.to },
        status: { notIn: [...CANCELLED] },
        itemsCount: { gte: 2 },
      },
      select: {
        amount: true,
        lineItems: {
          select: { productName: true, lineTotal: true, quantity: true },
          orderBy: { lineTotal: 'desc' },
          take: 5,
        },
      },
      take: 500,
    });

    const pairMap = new Map<
      string,
      { base: string; upsell: string; count: number; revenue: number }
    >();
    let multiOrders = 0;
    for (const order of orders) {
      const names = order.lineItems.map((l) => l.productName).filter(Boolean);
      if (names.length < 2) continue;
      multiOrders += 1;
      const base = names[0]!;
      for (const upsell of names.slice(1)) {
        const key = `${base}||${upsell}`;
        const cur = pairMap.get(key) ?? {
          base,
          upsell,
          count: 0,
          revenue: 0,
        };
        cur.count += 1;
        cur.revenue += order.amount / Math.max(1, names.length - 1);
        pairMap.set(key, cur);
      }
    }

    return [...pairMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 30)
      .map((p, i) => ({
        id: `up_${i}`,
        baseProduct: p.base,
        upsellProduct: p.upsell,
        count: p.count,
        revenueBdt: Math.round(p.revenue),
        rate:
          multiOrders > 0
            ? Math.round((p.count / multiOrders) * 1000) / 10
            : 0,
      }));
  }

  async getLoginHistory(organizationId: string): Promise<LoginHistoryRow[]> {
    const rows = await this.prisma.loginAudit.findMany({
      where: { organizationId },
      orderBy: { loggedInAt: 'desc' },
      take: 200,
    });
    return rows.map((r) => ({
      id: r.id,
      userName: r.userName,
      email: r.email,
      ip: r.ip === '::1' || r.ip === '127.0.0.1' ? 'localhost' : r.ip,
      // Re-summarize so older raw UA rows also show clean labels
      device: summarizeUserAgent(r.device),
      loggedInAt: r.loggedInAt.toISOString(),
      status: r.status === 'success' ? 'success' : 'failed',
    }));
  }

  async getPlatform(_organizationId: string): Promise<{
    kpis: ReportKpi[];
    trend: ChartPoint[];
  }> {
    return {
      kpis: [
        {
          id: 'info',
          label: 'Platform metrics',
          value: 'N/A',
          hint: 'Tenant CRM — platform SaaS metrics are admin-only',
        },
      ],
      trend: [],
    };
  }

  // ─── internals ─────────────────────────────────────────────────────────────

  private async loadOrders(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<OrderRow[]> {
    return this.prisma.order.findMany({
      where: {
        organizationId,
        deletedAt: null,
        orderDate: { gte: from, lte: to },
      },
      select: {
        id: true,
        status: true,
        amount: true,
        paidAmount: true,
        paymentMethod: true,
        paymentStatus: true,
        source: true,
        assignedAgentName: true,
        orderDate: true,
        createdAt: true,
        customerId: true,
        itemsCount: true,
      },
    });
  }

  private async rankSoldProducts(
    organizationId: string,
    from: Date,
    to: Date,
    take: number,
  ): Promise<RankedProductRow[]> {
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          organizationId,
          deletedAt: null,
          orderDate: { gte: from, lte: to },
          status: { notIn: [...CANCELLED] },
        },
      },
      select: {
        productId: true,
        productName: true,
        sku: true,
        quantity: true,
        lineTotal: true,
      },
    });

    const map = new Map<
      string,
      { name: string; sku?: string; units: number; revenue: number }
    >();
    for (const item of items) {
      const id = item.productId || item.sku || item.productName;
      const cur = map.get(id) ?? {
        name: item.productName,
        sku: item.sku ?? undefined,
        units: 0,
        revenue: 0,
      };
      cur.units += item.quantity;
      cur.revenue += item.lineTotal || 0;
      map.set(id, cur);
    }

    return [...map.entries()]
      .map(([id, v]) => ({
        id,
        name: v.name,
        sku: v.sku,
        value: v.units,
        secondaryValue: Math.round(v.revenue),
        unit: 'units',
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, take)
      .map((row, i) => ({ ...row, rank: i + 1 }));
  }

  private async rankReturnedProducts(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<RankedProductRow[]> {
    const items = await this.prisma.orderItem.findMany({
      where: {
        returnedQuantity: { gt: 0 },
        order: {
          organizationId,
          deletedAt: null,
          orderDate: { gte: from, lte: to },
        },
      },
      select: {
        productId: true,
        productName: true,
        sku: true,
        returnedQuantity: true,
        unitPrice: true,
      },
    });

    const map = new Map<
      string,
      { name: string; sku?: string; units: number; value: number }
    >();
    for (const item of items) {
      const id = item.productId || item.sku || item.productName;
      const cur = map.get(id) ?? {
        name: item.productName,
        sku: item.sku ?? undefined,
        units: 0,
        value: 0,
      };
      cur.units += item.returnedQuantity;
      cur.value += item.returnedQuantity * (item.unitPrice || 0);
      map.set(id, cur);
    }

    return [...map.entries()]
      .map(([id, v]) => ({
        id,
        name: v.name,
        sku: v.sku,
        value: v.units,
        secondaryValue: Math.round(v.value),
        unit: 'returned',
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50)
      .map((row, i) => ({ ...row, rank: i + 1 }));
  }

  private async rankPurchasedProducts(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<RankedProductRow[]> {
    const lines = await this.prisma.inventoryPurchaseLine.findMany({
      where: {
        purchase: {
          organizationId,
          purchaseDate: { gte: from, lte: to },
          stockStatus: { not: 'cancelled' },
        },
      },
      select: {
        productId: true,
        quantity: true,
        unitCost: true,
        product: { select: { name: true, sku: true } },
      },
    });

    const map = new Map<
      string,
      { name: string; sku?: string; units: number; cost: number }
    >();
    for (const line of lines) {
      const id = line.productId;
      const cur = map.get(id) ?? {
        name: line.product?.name ?? 'Product',
        sku: line.product?.sku ?? undefined,
        units: 0,
        cost: 0,
      };
      cur.units += line.quantity;
      cur.cost += line.quantity * Number(line.unitCost);
      map.set(id, cur);
    }

    return [...map.entries()]
      .map(([id, v]) => ({
        id,
        name: v.name,
        sku: v.sku,
        value: v.units,
        secondaryValue: Math.round(v.cost),
        unit: 'purchased',
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50)
      .map((row, i) => ({ ...row, rank: i + 1 }));
  }

  private async rankStock(
    organizationId: string,
    direction: 'asc' | 'desc',
  ): Promise<RankedProductRow[]> {
    const variants = await this.prisma.productVariant.findMany({
      where: {
        product: { organizationId, deletedAt: null },
      },
      select: {
        id: true,
        sku: true,
        stock: true,
        reorderLevel: true,
        product: { select: { name: true } },
      },
      orderBy: { stock: direction },
      take: 50,
    });

    return variants.map((v, i) => ({
      rank: i + 1,
      id: v.id,
      name: v.product.name,
      sku: v.sku,
      value: v.stock,
      secondaryValue: v.reorderLevel,
      unit: 'stock',
    }));
  }

  private async revenueByCategory(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<ChartPoint[]> {
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          organizationId,
          deletedAt: null,
          orderDate: { gte: from, lte: to },
          status: { notIn: [...CANCELLED] },
        },
      },
      select: {
        productId: true,
        lineTotal: true,
        productName: true,
      },
    });

    const productIds = [
      ...new Set(items.map((i) => i.productId).filter((id): id is string => Boolean(id))),
    ];
    const products =
      productIds.length > 0
        ? await this.prisma.product.findMany({
            where: { id: { in: productIds }, organizationId },
            select: {
              id: true,
              category: { select: { label: true } },
            },
          })
        : [];
    const categoryByProduct = new Map(
      products.map((p) => [p.id, p.category?.label ?? 'Uncategorized']),
    );

    const map = new Map<string, number>();
    for (const item of items) {
      const label = item.productId
        ? (categoryByProduct.get(item.productId) ?? 'Uncategorized')
        : 'Uncategorized';
      map.set(label, (map.get(label) ?? 0) + (item.lineTotal || 0));
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }

  private aggregateAgents(orders: OrderRow[]): EmployeeMetricRow[] {
    const map = new Map<
      string,
      { orders: number; revenue: number; delivered: number }
    >();
    for (const o of orders) {
      const name = o.assignedAgentName?.trim() || 'Unassigned';
      const cur = map.get(name) ?? { orders: 0, revenue: 0, delivered: 0 };
      cur.orders += 1;
      if (!CANCELLED.has(o.status)) cur.revenue += o.amount;
      if (DELIVERED.has(o.status)) cur.delivered += 1;
      map.set(name, cur);
    }

    return [...map.entries()]
      .map(([name, v], i) => ({
        id: `agent_${i}`,
        name,
        role: 'Agent',
        orders: v.orders,
        revenueBdt: Math.round(v.revenue),
        conversionRate:
          v.orders > 0
            ? Math.round((v.delivered / v.orders) * 1000) / 10
            : 0,
        avgOrderValue:
          v.orders > 0 ? Math.round(v.revenue / v.orders) : 0,
      }))
      .sort((a, b) => b.revenueBdt - a.revenueBdt);
  }

  private dailyTrend(
    orders: OrderRow[],
    from: Date,
    to: Date,
    valueFn: (o: OrderRow) => number,
  ): ChartPoint[] {
    const days = Math.max(
      1,
      Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)),
    );
    const bucketCount = Math.min(days, days <= 14 ? days : days <= 60 ? 14 : 12);
    const bucketMs = (to.getTime() - from.getTime()) / bucketCount;
    const buckets: ChartPoint[] = [];

    for (let i = 0; i < bucketCount; i++) {
      const start = new Date(from.getTime() + i * bucketMs);
      const end = new Date(from.getTime() + (i + 1) * bucketMs);
      const label =
        days <= 14
          ? start.toISOString().slice(5, 10)
          : start.toISOString().slice(5, 10);
      let value = 0;
      for (const o of orders) {
        const t = o.orderDate.getTime();
        if (t >= start.getTime() && t < end.getTime()) {
          value += valueFn(o);
        }
      }
      buckets.push({ label, value: Math.round(value) });
    }
    return buckets;
  }

  private money(n: number): string {
    return `৳${Math.round(n).toLocaleString('en-BD')}`;
  }

  private pctChange(current: number, previous: number): number | undefined {
    if (previous === 0) return current > 0 ? 100 : undefined;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private monthBounds(monthKey: string): { from: Date; to: Date } {
    const [y, m] = monthKey.split('-').map(Number);
    const from = new Date(y!, (m ?? 1) - 1, 1, 0, 0, 0, 0);
    const to = new Date(y!, m ?? 1, 0, 23, 59, 59, 999);
    return { from, to };
  }

  private monthKeysInRange(from: Date, to: Date): string[] {
    const keys: string[] = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= end) {
      keys.push(this.monthKey(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return keys.length ? keys : [this.monthKey(to)];
  }

  private targetProgress(
    targetOrders: number,
    targetRevenue: number,
    actualOrders: number,
    actualRevenue: number,
  ): number {
    const parts: number[] = [];
    if (targetOrders > 0) parts.push((actualOrders / targetOrders) * 100);
    if (targetRevenue > 0) parts.push((actualRevenue / targetRevenue) * 100);
    if (!parts.length) return 0;
    return Math.min(999, Math.round(parts.reduce((a, b) => a + b, 0) / parts.length));
  }

  private async computeTeamActuals(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<EmployeeMetricRow[]> {
    const orders = await this.loadOrders(organizationId, from, to);
    const users = await this.prisma.user.findMany({
      where: { organizationId, status: { not: 'suspended' } },
      select: { name: true, team: { select: { id: true, name: true } } },
    });
    const agents = this.aggregateAgents(orders);
    const teamMap = new Map<string, EmployeeMetricRow>();
    for (const agent of agents) {
      const user = users.find(
        (u) => u.name?.toLowerCase() === agent.name.toLowerCase(),
      );
      const teamName = user?.team?.name ?? 'Unassigned';
      const teamId = user?.team?.id ?? 'unassigned';
      const existing = teamMap.get(teamId);
      if (!existing) {
        teamMap.set(teamId, {
          id: teamId,
          name: teamName,
          role: 'Team',
          orders: agent.orders,
          revenueBdt: agent.revenueBdt,
          avgOrderValue: agent.avgOrderValue,
        });
      } else {
        existing.orders += agent.orders;
        existing.revenueBdt += agent.revenueBdt;
        existing.avgOrderValue =
          existing.orders > 0
            ? Math.round(existing.revenueBdt / existing.orders)
            : 0;
      }
    }
    return [...teamMap.values()].sort((a, b) => b.revenueBdt - a.revenueBdt);
  }
}

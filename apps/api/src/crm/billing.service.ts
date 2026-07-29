import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BillingInvoice,
  BillingOverview,
  BillingPaymentMethod,
  BillingPlanOption,
  BillingSubscription,
  CreateBillingInvoicePayload,
  PlatformBillingTenant,
  RechargeCreditsPayload,
  UpsertBillingPaymentMethodPayload,
} from '@laam/types';
import type { OrgBillingSubscription as SubRow } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const PLAN_CATALOG: BillingPlanOption[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyBdt: 2999,
    yearlyBdt: 29990,
    smsCredits: 2000,
    orderQuota: 3000,
    userSeats: 5,
    features: ['Orders & CRM', 'Basic reports', '2 courier integrations', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyBdt: 4999,
    yearlyBdt: 49990,
    smsCredits: 5000,
    orderQuota: 10000,
    userSeats: 15,
    features: [
      'Everything in Starter',
      'Inventory & accounting',
      'Facebook lead sync',
      'Priority support',
    ],
    isPopular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyBdt: 9999,
    yearlyBdt: 99990,
    smsCredits: 15000,
    orderQuota: 50000,
    userSeats: 50,
    features: [
      'Everything in Pro',
      'Custom roles',
      'API access',
      'Dedicated account manager',
    ],
  },
];

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
  }

  listPlans(): BillingPlanOption[] {
    return PLAN_CATALOG;
  }

  async getOverview(organizationId: string): Promise<BillingOverview> {
    const sub = await this.ensureSubscription(organizationId);
    const [paymentMethods, invoices, usersActive, ordersUsed] = await Promise.all([
      this.prisma.billingPaymentMethod.findMany({
        where: { organizationId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.billingInvoice.findMany({
        where: { organizationId },
        orderBy: { date: 'desc' },
        take: 20,
      }),
      this.prisma.user.count({
        where: { organizationId, status: 'active' },
      }),
      this.prisma.order.count({
        where: {
          organizationId,
          deletedAt: null,
          createdAt: { gte: sub.currentPeriodStart },
        },
      }),
    ]);

    const subscription = this.toSubscription(sub, usersActive, ordersUsed);
    const recentInvoices = invoices.map((i) => this.toInvoice(i));

    return {
      subscription,
      paymentMethods: paymentMethods.map((p) => this.toPaymentMethod(p)),
      recentInvoices,
      totalPaidBdt: recentInvoices
        .filter((i) => i.status === 'paid')
        .reduce((s, i) => s + i.amountBdt, 0),
      outstandingBdt: recentInvoices
        .filter((i) => i.status === 'pending' || i.status === 'overdue')
        .reduce((s, i) => s + i.amountBdt, 0),
    };
  }

  async listInvoices(organizationId: string): Promise<BillingInvoice[]> {
    const rows = await this.prisma.billingInvoice.findMany({
      where: { organizationId },
      orderBy: { date: 'desc' },
    });
    return rows.map((i) => this.toInvoice(i));
  }

  async recordCredits(
    organizationId: string,
    input: RechargeCreditsPayload,
  ): Promise<BillingOverview> {
    if (!input.amountBdt || input.amountBdt < 100) {
      throw new BadRequestException('amountBdt must be at least 100');
    }
    if (input.paymentMethodId) {
      const pm = await this.prisma.billingPaymentMethod.findFirst({
        where: { id: input.paymentMethodId, organizationId },
      });
      if (!pm) throw new BadRequestException('Payment method not found');
    }

    const sub = await this.ensureSubscription(organizationId);
    // Record-only: ৳2 ≈ 1 SMS credit (matches mock heuristic).
    const creditsToAdd = Math.floor(input.amountBdt / 2);
    await this.prisma.orgBillingSubscription.update({
      where: { id: sub.id },
      data: { smsCredits: sub.smsCredits + creditsToAdd },
    });

    return this.getOverview(organizationId);
  }

  async createInvoice(
    organizationId: string,
    input: CreateBillingInvoicePayload,
  ): Promise<BillingInvoice> {
    const sub = await this.ensureSubscription(organizationId);
    const plan = (input.plan ?? sub.plan) as BillingInvoice['plan'];
    const date = this.parseDate(input.date) ?? this.todayDateOnly();
    const dueDate =
      this.parseDate(input.dueDate) ??
      new Date(date.getTime() + 3 * 24 * 60 * 60 * 1000);
    const number = await this.nextInvoiceNumber(organizationId, date);

    const row = await this.prisma.billingInvoice.create({
      data: {
        organizationId,
        number,
        date,
        dueDate,
        amountBdt: input.amountBdt,
        status: input.status ?? 'pending',
        plan,
        periodLabel: input.periodLabel.trim(),
      },
    });
    return this.toInvoice(row);
  }

  async markInvoicePaid(
    organizationId: string,
    id: string,
  ): Promise<BillingInvoice> {
    const existing = await this.prisma.billingInvoice.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Invoice not found');
    const row = await this.prisma.billingInvoice.update({
      where: { id },
      data: { status: 'paid' },
    });
    return this.toInvoice(row);
  }

  async addPaymentMethod(
    organizationId: string,
    input: UpsertBillingPaymentMethodPayload,
  ): Promise<BillingPaymentMethod> {
    const label = input.label?.trim();
    if (!label) throw new BadRequestException('Label is required');

    if (input.isDefault) {
      await this.prisma.billingPaymentMethod.updateMany({
        where: { organizationId },
        data: { isDefault: false },
      });
    }

    const count = await this.prisma.billingPaymentMethod.count({
      where: { organizationId },
    });
    const row = await this.prisma.billingPaymentMethod.create({
      data: {
        organizationId,
        type: input.type,
        label,
        lastFour: input.lastFour?.trim() || null,
        isDefault: input.isDefault ?? count === 0,
      },
    });
    return this.toPaymentMethod(row);
  }

  async listPlatformBilling(): Promise<PlatformBillingTenant[]> {
    const orgs = await this.prisma.organization.findMany({
      orderBy: { name: 'asc' },
      include: {
        billingSubscription: true,
        billingInvoices: {
          where: { status: { in: ['pending', 'overdue', 'paid'] } },
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });

    return orgs.map((org) => {
      const sub = org.billingSubscription;
      const plan = (sub?.plan ?? org.plan ?? 'Starter') as PlatformBillingTenant['plan'];
      const catalog = PLAN_CATALOG.find((p) => p.name === plan);
      const outstandingBdt = org.billingInvoices
        .filter((i) => i.status === 'pending' || i.status === 'overdue')
        .reduce((s, i) => s + i.amountBdt, 0);
      const lastPaid = org.billingInvoices.find((i) => i.status === 'paid');
      const status: PlatformBillingTenant['status'] =
        org.status === 'suspended'
          ? 'suspended'
          : outstandingBdt > 0
            ? 'past_due'
            : 'active';

      return {
        tenantId: org.id,
        tenantName: org.name,
        plan,
        status,
        mrrBdt: sub?.amountBdt ?? catalog?.monthlyBdt ?? 0,
        lastPaymentDate: lastPaid
          ? lastPaid.date.toISOString().slice(0, 10)
          : undefined,
        outstandingBdt,
      };
    });
  }

  async ensureSubscription(organizationId: string): Promise<SubRow> {
    const existing = await this.prisma.orgBillingSubscription.findUnique({
      where: { organizationId },
    });
    if (existing) return existing;

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });
    const planName = this.normalizePlan(org?.plan);
    const catalog = PLAN_CATALOG.find((p) => p.name === planName) ?? PLAN_CATALOG[0]!;
    const start = this.todayDateOnly();
    const end = this.addMonths(start, 1);

    return this.prisma.orgBillingSubscription.create({
      data: {
        organizationId,
        plan: catalog.name,
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: start,
        currentPeriodEnd: end,
        nextBillingDate: end,
        amountBdt: catalog.monthlyBdt,
        smsCredits: catalog.smsCredits,
        smsCreditsUsed: 0,
        orderQuota: catalog.orderQuota,
        userSeats: catalog.userSeats,
        autoRenew: true,
      },
    });
  }

  private async nextInvoiceNumber(
    organizationId: string,
    date: Date,
  ): Promise<string> {
    const ym = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    const base = `LAAM-${ym}`;
    const count = await this.prisma.billingInvoice.count({
      where: { organizationId, number: { startsWith: base } },
    });
    return count === 0 ? base : `${base}-${count + 1}`;
  }

  private toSubscription(
    row: SubRow,
    usersActive: number,
    ordersUsed: number,
  ): BillingSubscription {
    return {
      plan: this.normalizePlan(row.plan),
      status: row.status as BillingSubscription['status'],
      billingCycle: row.billingCycle as BillingSubscription['billingCycle'],
      currentPeriodStart: row.currentPeriodStart.toISOString().slice(0, 10),
      currentPeriodEnd: row.currentPeriodEnd.toISOString().slice(0, 10),
      nextBillingDate: row.nextBillingDate.toISOString().slice(0, 10),
      amountBdt: row.amountBdt,
      smsCredits: row.smsCredits,
      smsCreditsUsed: row.smsCreditsUsed,
      orderQuota: row.orderQuota,
      ordersUsed,
      userSeats: row.userSeats,
      usersActive,
      autoRenew: row.autoRenew,
    };
  }

  private toInvoice(row: {
    id: string;
    number: string;
    date: Date;
    dueDate: Date;
    amountBdt: number;
    status: string;
    plan: string;
    periodLabel: string;
    pdfUrl: string | null;
  }): BillingInvoice {
    return {
      id: row.id,
      number: row.number,
      date: row.date.toISOString().slice(0, 10),
      dueDate: row.dueDate.toISOString().slice(0, 10),
      amountBdt: row.amountBdt,
      status: row.status as BillingInvoice['status'],
      plan: this.normalizePlan(row.plan),
      periodLabel: row.periodLabel,
      pdfUrl: row.pdfUrl ?? undefined,
    };
  }

  private toPaymentMethod(row: {
    id: string;
    type: string;
    label: string;
    lastFour: string | null;
    isDefault: boolean;
  }): BillingPaymentMethod {
    return {
      id: row.id,
      type: row.type as BillingPaymentMethod['type'],
      label: row.label,
      lastFour: row.lastFour ?? undefined,
      isDefault: row.isDefault,
    };
  }

  private normalizePlan(plan?: string | null): BillingSubscription['plan'] {
    if (plan === 'Pro' || plan === 'Enterprise' || plan === 'Starter') return plan;
    return 'Starter';
  }

  private parseDate(value?: string | null): Date | null {
    if (!value?.trim()) return null;
    const d = new Date(`${value.trim().slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    return d;
  }

  private todayDateOnly(): Date {
    const n = new Date();
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
  }

  private addMonths(d: Date, months: number): Date {
    const next = new Date(d);
    next.setUTCMonth(next.getUTCMonth() + months);
    return next;
  }
}

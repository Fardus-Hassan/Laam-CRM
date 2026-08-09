import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import type {
  AutomationSettings,
  FollowupAutomationRule,
  UpsertAutomationSettingsPayload,
} from '@laam/types';

import { PrismaService } from '../prisma/prisma.service';
import { FollowupsService } from './followups.service';
import { SmsService } from './sms.service';

@Injectable()
export class AutomationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly followups: FollowupsService,
  ) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
  }

  async getSettings(organizationId: string): Promise<AutomationSettings> {
    const [sms, followup] = await Promise.all([
      this.sms.getPublic(organizationId),
      this.getOrCreateFollowupRow(organizationId),
    ]);

    return {
      autoSmsOnStatusChange: sms.autoSmsOnStatusChange,
      statusSmsMap: sms.statusSmsMap ?? {},
      autoFollowupOnStatusChange: followup.autoFollowupOnStatusChange,
      statusFollowupMap: this.readFollowupMap(followup.statusFollowupMap),
      smsEnabled: sms.enabled,
      updatedAt:
        followup.updatedAt > new Date(sms.updatedAt)
          ? followup.updatedAt.toISOString()
          : sms.updatedAt,
    };
  }

  async updateSettings(
    organizationId: string,
    input: UpsertAutomationSettingsPayload,
  ): Promise<AutomationSettings> {
    if (
      input.autoSmsOnStatusChange !== undefined ||
      input.statusSmsMap !== undefined
    ) {
      await this.sms.updateStatusAutomation(organizationId, {
        autoSmsOnStatusChange: input.autoSmsOnStatusChange,
        statusSmsMap: input.statusSmsMap,
      });
    }

    if (
      input.autoFollowupOnStatusChange !== undefined ||
      input.statusFollowupMap !== undefined
    ) {
      const map = input.statusFollowupMap
        ? this.normalizeFollowupMap(input.statusFollowupMap)
        : undefined;
      await this.prisma.orgAutomationSettings.upsert({
        where: { organizationId },
        create: {
          organizationId,
          autoFollowupOnStatusChange: input.autoFollowupOnStatusChange ?? false,
          statusFollowupMap: map ?? {},
        },
        update: {
          ...(input.autoFollowupOnStatusChange !== undefined
            ? { autoFollowupOnStatusChange: input.autoFollowupOnStatusChange }
            : {}),
          ...(map !== undefined ? { statusFollowupMap: map } : {}),
        },
      });
    }

    return this.getSettings(organizationId);
  }

  /** Fire-and-forget from order status change when follow-up map matches. */
  async tryAutoFollowupOnStatusChange(
    organizationId: string,
    orderId: string,
    statusSlug: string,
  ): Promise<void> {
    const settings = await this.prisma.orgAutomationSettings.findUnique({
      where: { organizationId },
    });
    if (!settings?.autoFollowupOnStatusChange) return;

    const map = this.readFollowupMap(settings.statusFollowupMap);
    const key = statusSlug.trim().toLowerCase();
    const rule = map[key];
    if (!rule) return;

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, organizationId, deletedAt: null },
      include: {
        lineItems: { select: { productName: true, quantity: true } },
      },
    });
    if (!order) return;

    await this.followups.createFromOrder(
      organizationId,
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        phone: order.customerPhone,
        address: order.shippingAddress,
        district: order.district,
        area: order.shippingArea,
        source: order.source || 'automation',
        assignedAgentName: order.assignedAgentName,
        customerNotes: order.customerNote,
        lineItems: order.lineItems.map((l) => ({
          productName: l.productName,
          quantity: l.quantity,
        })),
        customerId: order.customerId,
        queue: rule.queue,
        delayDays: rule.delayDays,
        followupNotes: rule.note ?? `Auto follow-up on status → ${key}`,
      },
      { name: 'Automation' },
    );
  }

  private async getOrCreateFollowupRow(organizationId: string) {
    const existing = await this.prisma.orgAutomationSettings.findUnique({
      where: { organizationId },
    });
    if (existing) return existing;
    return this.prisma.orgAutomationSettings.create({
      data: {
        organizationId,
        autoFollowupOnStatusChange: false,
        statusFollowupMap: {},
      },
    });
  }

  private readFollowupMap(raw: unknown): Record<string, FollowupAutomationRule> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: Record<string, FollowupAutomationRule> = {};
    for (const [status, value] of Object.entries(raw as Record<string, unknown>)) {
      const key = status.trim().toLowerCase();
      if (!key || !value || typeof value !== 'object' || Array.isArray(value)) continue;
      const o = value as Record<string, unknown>;
      const queue = Number(o['queue'] ?? 1);
      const delayDays = Number(o['delayDays'] ?? 0);
      out[key] = {
        queue: Number.isFinite(queue) ? Math.min(3, Math.max(1, Math.floor(queue))) : 1,
        delayDays: Number.isFinite(delayDays)
          ? Math.min(90, Math.max(0, Math.floor(delayDays)))
          : 0,
        note: typeof o['note'] === 'string' ? o['note'] : undefined,
      };
    }
    return out;
  }

  private normalizeFollowupMap(
    input: Record<string, FollowupAutomationRule>,
  ): Record<string, FollowupAutomationRule> {
    return this.readFollowupMap(input);
  }
}

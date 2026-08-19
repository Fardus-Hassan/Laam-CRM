import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import type { ActorLabel } from '../common/actor.util';
import { PrismaService } from '../prisma/prisma.service';
import { OrgOrderStatusesService } from './org-order-statuses.service';
import { OrdersService } from './orders.service';

/** Bangladesh (UTC+6) — day boundaries for hold follow-up automation. */
const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
const SCAN_MS = 15 * 60 * 1000;
const EOD_HOUR_DHAKA = 23;

const SYSTEM_ACTOR: ActorLabel = { name: 'Hold workflow' };

function dhakaYmd(now = new Date()): string {
  const d = new Date(now.getTime() + BD_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function dhakaHour(now = new Date()): number {
  return new Date(now.getTime() + BD_OFFSET_MS).getUTCHours();
}

function startOfDhakaDay(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(Date.UTC(y, m - 1, d) - BD_OFFSET_MS);
}

function addDaysToYmd(ymd: string, days: number): string {
  const base = startOfDhakaDay(ymd);
  return dhakaYmd(new Date(base.getTime() + days * 24 * 60 * 60 * 1000));
}

@Injectable()
export class OrderHoldWorkflowService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderHoldWorkflowService.name);
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private lastEodYmd: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly orgOrderStatuses: OrgOrderStatusesService,
  ) {}

  onModuleInit() {
    this.scanTimer = setInterval(() => {
      void this.runScheduledTransitions();
    }, SCAN_MS);
    if (typeof this.scanTimer.unref === 'function') this.scanTimer.unref();
    setTimeout(() => void this.runScheduledTransitions(), 60_000).unref?.();
  }

  onModuleDestroy() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
  }

  /** Manual trigger (tests / ops) — same path as the background scanner. */
  async runScheduledTransitions(): Promise<{
    promoted: number;
    reverted: number;
  }> {
    const promoted = await this.promoteDueHoldOrders();
    let reverted = 0;
    const ymd = dhakaYmd();
    if (dhakaHour() >= EOD_HOUR_DHAKA && this.lastEodYmd !== ymd) {
      reverted = await this.revertUnresolvedHoldFollowup(ymd);
      this.lastEodYmd = ymd;
    }
    return { promoted, reverted };
  }

  /**
   * Due date reached: Hold → Hold Followup (call center queue for today).
   */
  private async promoteDueHoldOrders(): Promise<number> {
    const todayYmd = dhakaYmd();
    const startOfToday = startOfDhakaDay(todayYmd);
    let promoted = 0;

    try {
      const dueFollowups = await this.prisma.followup.findMany({
        where: {
          orderId: { not: null },
          skipped: false,
          followupStatus: { notIn: ['done', 'converted'] },
          scheduleDate: { lte: startOfToday },
        },
        select: { organizationId: true, orderId: true },
      });
      if (dueFollowups.length === 0) return 0;

      const orderIds = [
        ...new Set(
          dueFollowups
            .map((row) => row.orderId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const holdOrders = await this.prisma.order.findMany({
        where: {
          id: { in: orderIds },
          status: 'hold',
          deletedAt: null,
        },
        select: { id: true, organizationId: true, orderNumber: true },
      });

      const orgIds = [...new Set(holdOrders.map((order) => order.organizationId))];
      for (const organizationId of orgIds) {
        await this.orgOrderStatuses.ensureSeeded(organizationId);
      }

      for (const order of holdOrders) {
        try {
          await this.orders.updateStatus(
            order.organizationId,
            order.id,
            'hold_followup',
            SYSTEM_ACTOR,
          );
          promoted += 1;
        } catch (err) {
          this.logger.warn(
            `Hold → Hold Followup skipped for ${order.orderNumber}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `Hold promotion scan failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (promoted > 0) {
      this.logger.log(`Promoted ${promoted} order(s) from Hold to Hold Followup`);
    }
    return promoted;
  }

  /**
   * Day end: unresolved Hold Followup → Hold with follow-up rescheduled for tomorrow.
   */
  private async revertUnresolvedHoldFollowup(todayYmd: string): Promise<number> {
    const tomorrowYmd = addDaysToYmd(todayYmd, 1);
    let reverted = 0;

    try {
      const stale = await this.prisma.order.findMany({
        where: {
          status: 'hold_followup',
          deletedAt: null,
        },
        select: { id: true, organizationId: true, orderNumber: true },
      });

      const orgIds = [...new Set(stale.map((order) => order.organizationId))];
      for (const organizationId of orgIds) {
        await this.orgOrderStatuses.ensureSeeded(organizationId);
      }

      for (const order of stale) {
        try {
          await this.orders.updateStatus(
            order.organizationId,
            order.id,
            'hold',
            SYSTEM_ACTOR,
            { followUpDate: tomorrowYmd },
          );
          reverted += 1;
        } catch (err) {
          this.logger.warn(
            `Hold Followup → Hold skipped for ${order.orderNumber}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `Hold Followup revert scan failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (reverted > 0) {
      this.logger.log(
        `Reverted ${reverted} unresolved Hold Followup order(s) to Hold (due ${tomorrowYmd})`,
      );
    }
    return reverted;
  }
}

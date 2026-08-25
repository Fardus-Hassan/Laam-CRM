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
import {
  addDaysToYmd,
  dhakaYmd,
  HOLD_SCAN_MS,
  HOLD_WORKFLOW_LOCK_CLASS,
  HOLD_WORKFLOW_LOCK_ID,
  shouldRunEodRevert,
  utcDateOnlyFromYmd,
} from './order-hold-workflow.util';

const SYSTEM_ACTOR: ActorLabel = { name: 'Hold workflow' };

@Injectable()
export class OrderHoldWorkflowService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderHoldWorkflowService.name);
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private lastEodYmd: string | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly orgOrderStatuses: OrgOrderStatusesService,
  ) {}

  onModuleInit() {
    this.scanTimer = setInterval(() => {
      void this.runScheduledTransitions();
    }, HOLD_SCAN_MS);
    if (typeof this.scanTimer.unref === 'function') this.scanTimer.unref();
    setTimeout(() => void this.runScheduledTransitions(), 60_000).unref?.();
  }

  onModuleDestroy() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
  }

  /**
   * Same path as the background scanner.
   * Multi-instance safe: Postgres transaction advisory lock so only one API
   * replica promotes/reverts per tick.
   */
  async runScheduledTransitions(): Promise<{
    promoted: number;
    reverted: number;
  }> {
    if (this.running) {
      return { promoted: 0, reverted: 0 };
    }
    this.running = true;
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const locked = await this.tryAcquireJobLock(tx);
          if (!locked) {
            return { promoted: 0, reverted: 0 };
          }
          const promoted = await this.promoteDueHoldOrders();
          let reverted = 0;
          const now = new Date();
          if (shouldRunEodRevert(now, this.lastEodYmd)) {
            const ymd = dhakaYmd(now);
            reverted = await this.revertUnresolvedHoldFollowup(ymd);
            this.lastEodYmd = ymd;
          }
          return { promoted, reverted };
        },
        { timeout: 120_000, maxWait: 5_000 },
      );
    } catch (err) {
      this.logger.error(
        `Hold workflow tick failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { promoted: 0, reverted: 0 };
    } finally {
      this.running = false;
    }
  }

  private async tryAcquireJobLock(tx: {
    $queryRaw: PrismaService['$queryRaw'];
  }): Promise<boolean> {
    try {
      const rows = await tx.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_xact_lock(
          ${HOLD_WORKFLOW_LOCK_CLASS},
          ${HOLD_WORKFLOW_LOCK_ID}
        ) AS locked
      `;
      return Boolean(rows[0]?.locked);
    } catch (err) {
      this.logger.warn(
        `Hold workflow lock unavailable, running without cluster lock: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return true;
    }
  }

  /**
   * Due date reached: Hold → Hold Followup (call center queue for today).
   */
  private async promoteDueHoldOrders(): Promise<number> {
    const todayYmd = dhakaYmd();
    const dueOnOrBefore = utcDateOnlyFromYmd(todayYmd);
    let promoted = 0;

    try {
      const dueFollowups = await this.prisma.followup.findMany({
        where: {
          orderId: { not: null },
          skipped: false,
          followupStatus: { notIn: ['done', 'converted'] },
          scheduleDate: { lte: dueOnOrBefore },
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

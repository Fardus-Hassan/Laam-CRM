import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateIncentiveSpecialBonusPayload,
  CreateIncentiveAssignmentPayload,
  CreateIncentivePlanPayload,
  CreateIncentiveTeamPayload,
  IncentiveAssignment,
  IncentiveMetricConfig,
  IncentiveMetricType,
  IncentiveOpsMonth,
  IncentiveOverview,
  IncentivePerformanceLine,
  IncentivePerformanceReport,
  IncentivePeriodRun,
  IncentivePlan,
  IncentiveSalaryTemplate,
  IncentiveShiftTemplate,
  IncentiveSlab,
  IncentiveSlabInput,
  IncentiveTeam,
  UpdateIncentiveAssignmentPayload,
  UpdateIncentivePlanPayload,
  UpdateIncentiveTeamPayload,
  UpsertIncentiveAttendancePayload,
  UpsertIncentiveChannelPayload,
  UpsertIncentiveManualActualPayload,
  UpsertIncentiveSalaryPayload,
  UpsertIncentiveSurveyPayload,
} from '@laam/types';
import type {
  IncentiveAssignment as AssignmentRow,
  IncentivePayoutLine as PayoutRow,
  IncentivePlan as PlanRow,
  IncentivePeriodRun as PeriodRow,
  IncentiveSlab as SlabRow,
  IncentiveTeam as TeamRow,
  Team as OrgTeamRow,
  Prisma,
} from '@prisma/client';
import { Prisma as PrismaRuntime } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  applyReturnRatioCap,
  assignmentMatchKeys,
  computeReturnRatioPct,
  countRecoveries,
  evaluateMiss,
  matchIncentiveSlab,
  normalizeAgentKey,
  orderMatchKeys,
} from './incentive-calc';
import { LAAM_INCENTIVE_SEED } from './incentive-seed';

type PlanWithSlabs = PlanRow & {
  slabs: SlabRow[];
  team?: TeamRow | null;
  orgTeam?: Pick<OrgTeamRow, 'id' | 'name'> | null;
  _count?: { assignments: number };
};

const PLAN_INCLUDE = {
  slabs: { orderBy: { sortOrder: 'asc' as const } },
  team: true,
  orgTeam: { select: { id: true, name: true } },
  _count: { select: { assignments: true } },
};

const PLAN_TEAM_INCLUDE = {
  team: true,
  orgTeam: { select: { id: true, name: true } },
};

type IncentiveOrderRow = {
  id: string;
  assignedAgentName: string | null;
  assignedUserId: string | null;
  status: string;
  itemsCount: number;
  orderTag: string | null;
  orderDate: Date;
};

type IncentiveStatusActivity = {
  orderId: string;
  description: string | null;
  createdAt: Date;
};

export type IncentiveViewer = {
  userId: string;
  name?: string | null;
  systemRole?: string;
  manage: boolean;
};

type ViewerScope = {
  full: boolean;
  assignmentIds: Set<string>;
  planIds: Set<string>;
  userIds: Set<string>;
  nameKeys: Set<string>;
};

@Injectable()
export class IncentiveService {
  constructor(private readonly prisma: PrismaService) {}

  requireOrg(
    organizationId: string | null | undefined,
  ): asserts organizationId is string {
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
  }

  async overview(
    organizationId: string,
    viewer?: IncentiveViewer,
  ): Promise<IncentiveOverview> {
    await this.backfillOrgTeamLinks(organizationId);

    const [teams, plans, assignments, settings] = await Promise.all([
      this.loadHubTeams(organizationId),
      this.prisma.incentivePlan.findMany({
        where: { organizationId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: PLAN_INCLUDE,
      }),
      this.prisma.incentiveAssignment.findMany({
        where: { organizationId },
        orderBy: [{ agentName: 'asc' }],
        include: { plan: { include: PLAN_TEAM_INCLUDE } },
      }),
      this.prisma.incentiveOrgSettings.findUnique({
        where: { organizationId },
      }),
    ]);

    const mapped = assignments.map((a) =>
      this.toAssignment(
        a,
        a.plan.name,
        a.plan.orgTeam?.name ?? a.plan.team?.name,
      ),
    );
    const scope = await this.resolveViewerScope(organizationId, viewer);
    const visibleAssignments = mapped.filter((row) =>
      this.inAssignmentScope(row, scope),
    );
    const planIds = new Set(visibleAssignments.map((row) => row.planId));
    const visiblePlans = scope.full
      ? plans.map((p) => this.toPlan(p))
      : plans.filter((p) => planIds.has(p.id)).map((p) => this.toPlan(p));
    const orgTeamIds = new Set(
      visiblePlans.map((p) => p.teamId).filter((id): id is string => !!id),
    );
    const visibleTeams = scope.full
      ? teams
      : teams.filter((t) => orgTeamIds.has(t.id));

    return {
      teams: visibleTeams,
      plans: visiblePlans,
      assignments: visibleAssignments,
      salaryTemplate: scope.full ? this.parseSalary(settings?.salaryTemplate) : null,
      shiftTemplates: this.parseShifts(settings?.shiftTemplates),
      teamCount: visibleTeams.length,
      planCount: visiblePlans.length,
      assignmentCount: visibleAssignments.length,
    };
  }

  async listTeams(organizationId: string): Promise<IncentiveTeam[]> {
    await this.backfillOrgTeamLinks(organizationId);
    return this.loadHubTeams(organizationId);
  }

  async createTeam(
    _organizationId: string,
    _payload: CreateIncentiveTeamPayload,
  ): Promise<IncentiveTeam> {
    throw new BadRequestException(
      'Create teams on the Users page. Incentive only stores KPI structure for those teams.',
    );
  }

  async updateTeam(
    _organizationId: string,
    _id: string,
    _payload: UpdateIncentiveTeamPayload,
  ): Promise<IncentiveTeam> {
    throw new BadRequestException(
      'Rename or deactivate teams on the Users page.',
    );
  }

  async deleteTeam(_organizationId: string, _id: string): Promise<void> {
    throw new BadRequestException(
      'Remove teams on the Users page. KPI structure stays until you delete the plan.',
    );
  }

  async listPlans(organizationId: string): Promise<IncentivePlan[]> {
    const rows = await this.prisma.incentivePlan.findMany({
      where: { organizationId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: PLAN_INCLUDE,
    });
    return rows.map((p) => this.toPlan(p));
  }

  async createPlan(
    organizationId: string,
    payload: CreateIncentivePlanPayload,
  ): Promise<IncentivePlan> {
    const name = payload.name.trim();
    const slug = this.slugify(payload.slug?.trim() || name);
    const orgTeam = payload.teamId
      ? await this.requireOrgTeam(organizationId, payload.teamId)
      : null;
    if (orgTeam) {
      const existing = await this.prisma.incentivePlan.findFirst({
        where: { organizationId, orgTeamId: orgTeam.id },
      });
      if (existing) {
        throw new ConflictException(
          'This team already has a KPI structure. Edit it instead.',
        );
      }
    }
    try {
      const row = await this.prisma.incentivePlan.create({
        data: {
          organizationId,
          teamId: null,
          orgTeamId: orgTeam?.id ?? null,
          name,
          slug,
          description: payload.description?.trim() || null,
          metricType: payload.metricType,
          metricConfig: (payload.metricConfig ?? undefined) as
            | Prisma.InputJsonValue
            | undefined,
          teamMonthlyTarget: payload.teamMonthlyTarget ?? null,
          isActive: payload.isActive ?? true,
          prorataAboveTop: payload.prorataAboveTop ?? false,
          sortOrder: payload.sortOrder ?? 0,
          slabs: payload.slabs?.length
            ? { create: this.slabCreates(payload.slabs) }
            : undefined,
        },
        include: PLAN_INCLUDE,
      });
      await this.syncOrgTeamAssignments(organizationId);
      return this.toPlan(row);
    } catch (e) {
      this.rethrowUnique(e, 'Plan slug already exists');
    }
  }

  async updatePlan(
    organizationId: string,
    id: string,
    payload: UpdateIncentivePlanPayload,
  ): Promise<IncentivePlan> {
    await this.requirePlan(organizationId, id);
    const orgTeam =
      payload.teamId !== undefined && payload.teamId
        ? await this.requireOrgTeam(organizationId, payload.teamId)
        : null;
    try {
      await this.prisma.$transaction(async (tx) => {
        if (payload.slabs !== undefined) {
          await tx.incentiveSlab.deleteMany({ where: { planId: id } });
          if (payload.slabs.length) {
            await tx.incentiveSlab.createMany({
              data: this.slabCreates(payload.slabs).map((s) => ({
                ...s,
                planId: id,
              })),
            });
          }
        }
        await tx.incentivePlan.update({
          where: { id },
          data: {
            ...(payload.name !== undefined
              ? { name: payload.name.trim() }
              : {}),
            ...(payload.slug !== undefined
              ? { slug: this.slugify(payload.slug.trim()) }
              : {}),
            ...(payload.teamId !== undefined
              ? { orgTeamId: orgTeam?.id ?? null }
              : {}),
            ...(payload.description !== undefined
              ? { description: payload.description?.trim() || null }
              : {}),
            ...(payload.metricType !== undefined
              ? { metricType: payload.metricType }
              : {}),
            ...(payload.metricConfig !== undefined
              ? {
                  metricConfig:
                    payload.metricConfig === null
                      ? PrismaRuntime.JsonNull
                      : (payload.metricConfig as Prisma.InputJsonValue),
                }
              : {}),
            ...(payload.teamMonthlyTarget !== undefined
              ? { teamMonthlyTarget: payload.teamMonthlyTarget }
              : {}),
            ...(payload.isActive !== undefined
              ? { isActive: payload.isActive }
              : {}),
            ...(payload.prorataAboveTop !== undefined
              ? { prorataAboveTop: payload.prorataAboveTop }
              : {}),
            ...(payload.sortOrder !== undefined
              ? { sortOrder: payload.sortOrder }
              : {}),
          },
        });
      });
      const row = await this.prisma.incentivePlan.findUniqueOrThrow({
        where: { id },
        include: PLAN_INCLUDE,
      });
      await this.syncOrgTeamAssignments(organizationId);
      return this.toPlan(row);
    } catch (e) {
      this.rethrowUnique(e, 'Plan slug already exists');
    }
  }

  async deletePlan(organizationId: string, id: string): Promise<void> {
    await this.requirePlan(organizationId, id);
    await this.prisma.incentivePlan.delete({ where: { id } });
  }

  async listAssignments(
    organizationId: string,
    viewer?: IncentiveViewer,
  ): Promise<IncentiveAssignment[]> {
    const rows = await this.prisma.incentiveAssignment.findMany({
      where: { organizationId },
      orderBy: [{ agentName: 'asc' }],
        include: { plan: { include: PLAN_TEAM_INCLUDE } },
    });
    const mapped = rows.map((a) =>
      this.toAssignment(
        a,
        a.plan.name,
        a.plan.orgTeam?.name ?? a.plan.team?.name,
      ),
    );
    const scope = await this.resolveViewerScope(organizationId, viewer);
    return mapped.filter((row) => this.inAssignmentScope(row, scope));
  }

  async createAssignment(
    organizationId: string,
    payload: CreateIncentiveAssignmentPayload,
  ): Promise<IncentiveAssignment> {
    const plan = await this.requirePlan(organizationId, payload.planId);
    const agentName = payload.agentName.trim();
    if (!agentName) throw new BadRequestException('Agent name is required');
    const startsOn =
      this.parseDate(payload.startsOn) ?? this.startOfMonth(new Date());
    const endsOn = payload.endsOn ? this.parseDate(payload.endsOn) : null;
    await this.assertNoOverlappingAssignment(organizationId, {
      planId: payload.planId,
      agentName,
      startsOn,
      endsOn,
      isActive: payload.isActive ?? true,
    });
    const row = await this.prisma.incentiveAssignment.create({
      data: {
        organizationId,
        planId: payload.planId,
        agentName,
        userId: payload.userId || null,
        shift: payload.shift?.trim() || null,
        startsOn,
        endsOn,
        isActive: payload.isActive ?? true,
        hrStatus: payload.hrStatus ?? 'active',
      },
        include: { plan: { include: PLAN_TEAM_INCLUDE } },
    });
    return this.toAssignment(
      row,
      plan.name,
      row.plan.orgTeam?.name ?? row.plan.team?.name,
    );
  }

  async updateAssignment(
    organizationId: string,
    id: string,
    payload: UpdateIncentiveAssignmentPayload,
  ): Promise<IncentiveAssignment> {
    const existing = await this.requireAssignment(organizationId, id);
    if (payload.planId) await this.requirePlan(organizationId, payload.planId);
    const agentName = payload.agentName?.trim() ?? existing.agentName;
    const startsOn =
      payload.startsOn !== undefined
        ? (this.parseDate(payload.startsOn) ?? existing.startsOn)
        : existing.startsOn;
    const endsOn =
      payload.endsOn !== undefined
        ? payload.endsOn
          ? this.parseDate(payload.endsOn)
          : null
        : existing.endsOn;
    await this.assertNoOverlappingAssignment(
      organizationId,
      {
        planId: payload.planId ?? existing.planId,
        agentName,
        startsOn,
        endsOn,
        isActive: payload.isActive ?? existing.isActive,
      },
      existing.id,
    );
    const row = await this.prisma.incentiveAssignment.update({
      where: { id: existing.id },
      data: {
        ...(payload.planId !== undefined ? { planId: payload.planId } : {}),
        ...(payload.agentName !== undefined ? { agentName } : {}),
        ...(payload.userId !== undefined
          ? { userId: payload.userId || null }
          : {}),
        ...(payload.shift !== undefined
          ? { shift: payload.shift?.trim() || null }
          : {}),
        ...(payload.startsOn !== undefined ? { startsOn } : {}),
        ...(payload.endsOn !== undefined ? { endsOn } : {}),
        ...(payload.isActive !== undefined
          ? { isActive: payload.isActive }
          : {}),
        ...(payload.hrStatus !== undefined
          ? { hrStatus: payload.hrStatus }
          : {}),
        ...(payload.consecutiveMissMonths !== undefined
          ? { consecutiveMissMonths: payload.consecutiveMissMonths }
          : {}),
      },
        include: { plan: { include: PLAN_TEAM_INCLUDE } },
    });
    return this.toAssignment(
      row,
      row.plan.name,
      row.plan.orgTeam?.name ?? row.plan.team?.name,
    );
  }

  async deleteAssignment(organizationId: string, id: string): Promise<void> {
    await this.requireAssignment(organizationId, id);
    await this.prisma.incentiveAssignment.delete({ where: { id } });
  }

  async upsertSalary(
    organizationId: string,
    payload: UpsertIncentiveSalaryPayload,
  ): Promise<IncentiveSalaryTemplate> {
    const salaryTemplate = payload as unknown as Prisma.InputJsonValue;
    await this.prisma.incentiveOrgSettings.upsert({
      where: { organizationId },
      create: { organizationId, salaryTemplate },
      update: { salaryTemplate },
    });
    return payload;
  }

  async upsertShifts(
    organizationId: string,
    shifts: IncentiveShiftTemplate[],
  ): Promise<IncentiveShiftTemplate[]> {
    const shiftTemplates = shifts as unknown as Prisma.InputJsonValue;
    await this.prisma.incentiveOrgSettings.upsert({
      where: { organizationId },
      create: { organizationId, shiftTemplates },
      update: { shiftTemplates },
    });
    return shifts;
  }

  async upsertManualActual(
    organizationId: string,
    payload: UpsertIncentiveManualActualPayload,
    user: { userId: string; name?: string; email: string },
  ) {
    const assignment = await this.requireAssignment(
      organizationId,
      payload.assignmentId,
    );
    const updatedByName = user.name?.trim() || user.email;
    return this.prisma.incentiveManualActual.upsert({
      where: {
        assignmentId_yearMonth: {
          assignmentId: assignment.id,
          yearMonth: this.validateYearMonth(payload.yearMonth),
        },
      },
      create: {
        organizationId,
        assignmentId: assignment.id,
        yearMonth: payload.yearMonth,
        actualValue: payload.actualValue,
        note: payload.note?.trim() || null,
        updatedByUserId: user.userId,
        updatedByName,
      },
      update: {
        actualValue: payload.actualValue,
        note: payload.note?.trim() || null,
        updatedByUserId: user.userId,
        updatedByName,
      },
    });
  }

  async getOps(
    organizationId: string,
    yearMonth: string,
    viewer?: IncentiveViewer,
  ): Promise<IncentiveOpsMonth> {
    const ym = this.validateYearMonth(yearMonth);
    const [attendance, surveys, channels, specialBonuses] = await Promise.all([
      this.prisma.incentiveAttendance.findMany({
        where: { organizationId, yearMonth: ym },
        orderBy: { agentName: 'asc' },
      }),
      this.prisma.incentiveSurveyLog.findMany({
        where: { organizationId, yearMonth: ym },
        orderBy: { agentName: 'asc' },
      }),
      this.prisma.incentiveChannelLog.findMany({
        where: { organizationId, yearMonth: ym },
        orderBy: [{ agentName: 'asc' }, { channel: 'asc' }],
      }),
      this.prisma.incentiveSpecialBonus.findMany({
        where: { organizationId, yearMonth: ym },
        orderBy: [{ agentName: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);
    return this.scopeOps(
      {
        yearMonth: ym,
        attendance: attendance.map((row) => {
          const eligible = this.attendanceEligible(row);
          return {
            ...row,
            fullAttendance: eligible,
            attendanceBonusEligible: eligible,
          };
        }),
        surveys: surveys.map((row) => ({
          ...row,
          recordedAt: row.recordedAt.toISOString(),
        })),
        channels: channels.map((row) => ({
          ...row,
          channel:
            row.channel as IncentiveOpsMonth['channels'][number]['channel'],
        })),
        specialBonuses: specialBonuses.map((row) => ({
          ...row,
          createdByName: row.createdByName ?? undefined,
          createdAt: row.createdAt.toISOString(),
        })),
      },
      await this.resolveViewerScope(organizationId, viewer),
    );
  }

  async upsertAttendance(
    organizationId: string,
    payload: UpsertIncentiveAttendancePayload,
  ) {
    const agentName = payload.agentName.trim();
    const yearMonth = this.validateYearMonth(payload.yearMonth);
    const row = await this.prisma.incentiveAttendance.upsert({
      where: {
        organizationId_agentName_yearMonth: {
          organizationId,
          agentName,
          yearMonth,
        },
      },
      create: {
        organizationId,
        agentName,
        yearMonth,
        userId: payload.userId || null,
        presentDays: payload.presentDays,
        workingDays: payload.workingDays,
        lateCount: payload.lateCount ?? 0,
        earlyLeaveCount: payload.earlyLeaveCount ?? 0,
        unapprovedAbsence: payload.unapprovedAbsence ?? 0,
        note: payload.note?.trim() || null,
      },
      update: {
        userId: payload.userId || null,
        presentDays: payload.presentDays,
        workingDays: payload.workingDays,
        lateCount: payload.lateCount ?? 0,
        earlyLeaveCount: payload.earlyLeaveCount ?? 0,
        unapprovedAbsence: payload.unapprovedAbsence ?? 0,
        note: payload.note?.trim() || null,
      },
    });
    const eligible = this.attendanceEligible(row);
    return {
      ...row,
      fullAttendance: eligible,
      attendanceBonusEligible: eligible,
    };
  }

  async upsertSurvey(
    organizationId: string,
    payload: UpsertIncentiveSurveyPayload,
  ) {
    const agentName = payload.agentName.trim();
    const yearMonth = this.validateYearMonth(payload.yearMonth);
    if (payload.assignmentId) {
      const assignment = await this.requireAssignment(
        organizationId,
        payload.assignmentId,
      );
      if (assignment.agentName !== agentName) {
        throw new BadRequestException(
          'Assignment does not belong to the supplied agent',
        );
      }
    }
    return this.prisma.incentiveSurveyLog.upsert({
      where: {
        organizationId_agentName_yearMonth: {
          organizationId,
          agentName,
          yearMonth,
        },
      },
      create: {
        organizationId,
        agentName,
        yearMonth,
        assignmentId: payload.assignmentId || null,
        surveyCount: payload.surveyCount,
        note: payload.note?.trim() || null,
      },
      update: {
        assignmentId: payload.assignmentId || null,
        surveyCount: payload.surveyCount,
        note: payload.note?.trim() || null,
      },
    });
  }

  async upsertChannel(
    organizationId: string,
    payload: UpsertIncentiveChannelPayload,
  ) {
    const agentName = payload.agentName.trim();
    const yearMonth = this.validateYearMonth(payload.yearMonth);
    if (payload.assignmentId) {
      const assignment = await this.requireAssignment(
        organizationId,
        payload.assignmentId,
      );
      if (assignment.agentName !== agentName) {
        throw new BadRequestException(
          'Assignment does not belong to the supplied agent',
        );
      }
    }
    return this.prisma.incentiveChannelLog.upsert({
      where: {
        organizationId_agentName_yearMonth_channel: {
          organizationId,
          agentName,
          yearMonth,
          channel: payload.channel,
        },
      },
      create: {
        organizationId,
        agentName,
        yearMonth,
        assignmentId: payload.assignmentId || null,
        channel: payload.channel,
        activityCount: payload.activityCount,
        note: payload.note?.trim() || null,
      },
      update: {
        assignmentId: payload.assignmentId || null,
        activityCount: payload.activityCount,
        note: payload.note?.trim() || null,
      },
    });
  }

  async createSpecialBonus(
    organizationId: string,
    payload: CreateIncentiveSpecialBonusPayload,
    user: { userId: string; name?: string; email: string },
  ) {
    const agentName = payload.agentName.trim();
    if (payload.assignmentId) {
      const assignment = await this.requireAssignment(
        organizationId,
        payload.assignmentId,
      );
      if (assignment.agentName !== agentName) {
        throw new BadRequestException(
          'Assignment does not belong to the supplied agent',
        );
      }
    }
    return this.prisma.incentiveSpecialBonus.create({
      data: {
        organizationId,
        yearMonth: this.validateYearMonth(payload.yearMonth),
        agentName,
        assignmentId: payload.assignmentId || null,
        amountBdt: payload.amountBdt,
        reason: payload.reason.trim(),
        createdByUserId: user.userId,
        createdByName: user.name?.trim() || user.email,
      },
    });
  }

  async deleteSpecialBonus(organizationId: string, id: string): Promise<void> {
    const row = await this.prisma.incentiveSpecialBonus.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Special bonus not found');
    await this.prisma.incentiveSpecialBonus.delete({ where: { id: row.id } });
  }

  /** Attach PDF KPI structure to matching Users-page teams. Does not create teams. */
  async seedDefaults(organizationId: string): Promise<IncentiveOverview> {
    const orgTeams = await this.prisma.team.findMany({
      where: { organizationId },
    });
    if (!orgTeams.length) {
      throw new BadRequestException(
        'Create teams on the Users page first, then apply the PDF KPI structure here.',
      );
    }
    await this.upsertSeedSettings(organizationId);
    await this.attachSeedPlansToOrgTeams(organizationId, orgTeams);
    await this.syncOrgTeamAssignments(organizationId);
    return this.overview(organizationId);
  }

  /** Add missing PDF structures for Users teams that still have none. */
  async syncMissingSeed(organizationId: string): Promise<IncentiveOverview> {
    const orgTeams = await this.prisma.team.findMany({
      where: { organizationId },
    });
    await this.upsertSeedSettings(organizationId);
    if (orgTeams.length) {
      await this.attachSeedPlansToOrgTeams(organizationId, orgTeams);
    }
    await this.syncOrgTeamAssignments(organizationId);
    return this.overview(organizationId);
  }

  async performance(
    organizationId: string,
    yearMonth: string,
    viewer?: IncentiveViewer,
  ): Promise<IncentivePerformanceReport> {
    const ym = this.validateYearMonth(yearMonth);
    await this.backfillOrgTeamLinks(organizationId);
    await this.syncOrgTeamAssignments(organizationId);
    const months = [
      ym,
      this.offsetYearMonth(ym, -1),
      this.offsetYearMonth(ym, -2),
    ];
    const { start: periodStart, end: periodEnd } = this.periodBounds(ym);
    const historyStart = this.periodBounds(months[2]!).start;

    const assignments = await this.prisma.incentiveAssignment.findMany({
      where: {
        organizationId,
        isActive: true,
        hrStatus: { not: 'terminated' },
        startsOn: { lte: periodEnd },
        OR: [{ endsOn: null }, { endsOn: { gte: periodStart } }],
      },
      include: {
        plan: {
          include: {
            slabs: { orderBy: { sortOrder: 'asc' as const } },
            ...PLAN_TEAM_INCLUDE,
          },
        },
      },
    });

    const agentNames = [...new Set(assignments.map((a) => a.agentName))];
    const userIds = [
      ...new Set(
        assignments
          .map((a) => a.userId?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const assignmentIds = assignments.map((a) => a.id);
    const orderOr: Prisma.OrderWhereInput[] = [];
    if (agentNames.length) {
      orderOr.push({ assignedAgentName: { in: agentNames } });
    }
    if (userIds.length) {
      orderOr.push({ assignedUserId: { in: userIds } });
    }

    const [
      orders,
      manualActuals,
      attendanceRows,
      surveyRows,
      channelRows,
      specialBonuses,
      settings,
      periodRun,
    ] = await Promise.all([
      orderOr.length === 0
        ? Promise.resolve([] as IncentiveOrderRow[])
        : this.prisma.order.findMany({
            where: {
              organizationId,
              deletedAt: null,
              OR: orderOr,
              orderDate: { gte: historyStart, lte: periodEnd },
            },
            select: {
              id: true,
              assignedAgentName: true,
              assignedUserId: true,
              status: true,
              itemsCount: true,
              orderTag: true,
              orderDate: true,
            },
          }),
      assignmentIds.length === 0
        ? Promise.resolve([])
        : this.prisma.incentiveManualActual.findMany({
            where: {
              organizationId,
              assignmentId: { in: assignmentIds },
              yearMonth: { in: months },
            },
          }),
      this.prisma.incentiveAttendance.findMany({
        where: { organizationId, yearMonth: ym, agentName: { in: agentNames } },
      }),
      this.prisma.incentiveSurveyLog.findMany({
        where: {
          organizationId,
          yearMonth: { in: months },
          agentName: { in: agentNames },
        },
      }),
      this.prisma.incentiveChannelLog.findMany({
        where: {
          organizationId,
          yearMonth: { in: months },
          agentName: { in: agentNames },
        },
      }),
      this.prisma.incentiveSpecialBonus.findMany({
        where: { organizationId, yearMonth: ym, agentName: { in: agentNames } },
      }),
      this.prisma.incentiveOrgSettings.findUnique({
        where: { organizationId },
      }),
      this.prisma.incentivePeriodRun.findUnique({
        where: { organizationId_yearMonth: { organizationId, yearMonth: ym } },
        select: { status: true },
      }),
    ]);

    const orderIds = orders.map((o) => o.id);
    const statusActivities: IncentiveStatusActivity[] =
      orderIds.length === 0
        ? []
        : await this.prisma.orderActivity.findMany({
            where: {
              organizationId,
              orderId: { in: orderIds },
              type: 'status',
              createdAt: { gte: historyStart, lte: periodEnd },
            },
            select: {
              orderId: true,
              description: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          });

    const ordersByKeyMonth = new Map<string, IncentiveOrderRow[]>();
    for (const o of orders) {
      const orderMonth = this.toYearMonth(o.orderDate);
      for (const key of orderMatchKeys(o)) {
        const mapKey = `${key}\u0000${orderMonth}`;
        const list = ordersByKeyMonth.get(mapKey) ?? [];
        list.push(o);
        ordersByKeyMonth.set(mapKey, list);
      }
    }

    const activitiesByOrderMonth = new Map<string, IncentiveStatusActivity[]>();
    for (const act of statusActivities) {
      const month = this.toYearMonth(act.createdAt);
      const mapKey = `${act.orderId}\u0000${month}`;
      const list = activitiesByOrderMonth.get(mapKey) ?? [];
      list.push(act);
      activitiesByOrderMonth.set(mapKey, list);
    }
    const manualByAssignmentMonth = new Map(
      manualActuals.map((a) => [`${a.assignmentId}\u0000${a.yearMonth}`, a]),
    );
    const attendanceByAgent = new Map(
      attendanceRows.map((row) => [row.agentName, row]),
    );
    const surveyByAgentMonth = new Map<string, number>();
    for (const row of surveyRows) {
      surveyByAgentMonth.set(
        `${row.agentName}\u0000${row.yearMonth}`,
        (surveyByAgentMonth.get(`${row.agentName}\u0000${row.yearMonth}`) ??
          0) + row.surveyCount,
      );
    }
    const channelsByAgentMonth = new Map<string, typeof channelRows>();
    for (const row of channelRows) {
      const key = `${row.agentName}\u0000${row.yearMonth}`;
      const list = channelsByAgentMonth.get(key) ?? [];
      list.push(row);
      channelsByAgentMonth.set(key, list);
    }
    const specialBonusByAgent = new Map<string, number>();
    for (const row of specialBonuses) {
      specialBonusByAgent.set(
        row.agentName,
        (specialBonusByAgent.get(row.agentName) ?? 0) + row.amountBdt,
      );
    }
    const salary = this.parseSalary(settings?.salaryTemplate);
    const defaultWorkingDays =
      salary?.expectedWorkingDays ?? this.weekdaysInMonth(periodStart);

    const lines: IncentivePerformanceLine[] = [];
    for (const a of assignments) {
      if (!a.plan.isActive) continue;
      const monthLines = months.map((month) => {
        const monthAttendance =
          month === ym ? attendanceByAgent.get(a.agentName) : undefined;
        const workingDays =
          monthAttendance?.workingDays ??
          salary?.expectedWorkingDays ??
          this.weekdaysInMonth(this.periodBounds(month).start);
        const agentOrders = this.ordersForAssignment(
          a,
          month,
          ordersByKeyMonth,
        );
        const monthBounds = this.periodBounds(month);
        const recoveryActivities = agentOrders.flatMap(
          (o) => activitiesByOrderMonth.get(`${o.id}\u0000${month}`) ?? [],
        );
        // Include earlier history activities for same orders (sawIncomplete before period)
        const priorActivities =
          month === ym
            ? statusActivities.filter((act) =>
                agentOrders.some((o) => o.id === act.orderId),
              )
            : recoveryActivities;
        return this.calcLine(
          a,
          agentOrders,
          manualByAssignmentMonth.get(`${a.id}\u0000${month}`)?.actualValue,
          surveyByAgentMonth.get(`${a.agentName}\u0000${month}`) ?? 0,
          channelsByAgentMonth.get(`${a.agentName}\u0000${month}`) ?? [],
          workingDays,
          priorActivities,
          monthBounds.start,
          monthBounds.end,
        );
      });
      const line = monthLines[0]!;
      let consecutiveMissMonths = 0;
      for (let i = 0; i < months.length; i += 1) {
        if (!this.assignmentActiveInMonth(a, months[i]!)) break;
        const candidate = monthLines[i]!;
        const direction = this.directionFor(
          a.plan.metricType as IncentiveMetricType,
          this.parseConfig(a.plan.metricConfig),
        );
        const manualMissing =
          a.plan.metricType === 'manual' &&
          !manualByAssignmentMonth.has(`${a.id}\u0000${months[i]}`);
        if (
          manualMissing ||
          evaluateMiss(direction, candidate.actualValue, a.plan.slabs)
        ) {
          consecutiveMissMonths += 1;
        } else {
          break;
        }
      }
      line.consecutiveMissMonths = consecutiveMissMonths;
      line.hrStatus = this.hrStatusForMisses(consecutiveMissMonths);
      if (consecutiveMissMonths >= 3) line.warning = 'terminated';
      else if (consecutiveMissMonths >= 2) line.warning = 'final_warning';
      lines.push(line);
    }

    const paidBonusAgents = new Set<string>();
    for (const line of lines) {
      const attendance = attendanceByAgent.get(line.agentName);
      const attendanceEligible =
        !!attendance && this.attendanceEligible(attendance);
      line.attendanceBonusEligible = attendanceEligible;
      if (!paidBonusAgents.has(line.agentName)) {
        line.specialBonusBdt = specialBonusByAgent.get(line.agentName) ?? 0;
        line.attendanceBonusBdt = attendanceEligible
          ? (salary?.attendanceBonusBdt ?? 0)
          : 0;
        paidBonusAgents.add(line.agentName);
      } else {
        line.specialBonusBdt = 0;
        line.attendanceBonusBdt = 0;
      }
      line.totalPayBdt =
        line.incentiveBdt +
        (line.specialBonusBdt ?? 0) +
        (line.attendanceBonusBdt ?? 0);
    }

    const rollups = new Map<
      string,
      NonNullable<IncentivePerformanceReport['teamRollups']>[number]
    >();
    for (const line of lines) {
      const plan = assignments.find((a) => a.planId === line.planId)?.plan;
      const current = rollups.get(line.planId) ?? {
        planId: line.planId,
        planName: line.planName,
        teamName: line.teamName,
        orgTeamId: plan?.orgTeamId ?? null,
        teamMonthlyTarget: plan?.teamMonthlyTarget ?? null,
        actualTotal: 0,
      };
      current.actualTotal += line.actualValue;
      if (current.teamMonthlyTarget != null) {
        current.met = current.actualTotal >= current.teamMonthlyTarget;
      }
      rollups.set(line.planId, current);
    }

    const report: IncentivePerformanceReport = {
      yearMonth: ym,
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      workingDaysInMonth: defaultWorkingDays,
      lines,
      totalIncentiveBdt: lines.reduce((s, l) => s + l.incentiveBdt, 0),
      totalSpecialBonusBdt: lines.reduce(
        (sum, line) => sum + (line.specialBonusBdt ?? 0),
        0,
      ),
      totalAttendanceBonusBdt: lines.reduce(
        (sum, line) => sum + (line.attendanceBonusBdt ?? 0),
        0,
      ),
      totalPayBdt: lines.reduce(
        (sum, line) => sum + (line.totalPayBdt ?? 0),
        0,
      ),
      warningCount: lines.filter(
        (line) => line.warning && line.warning !== 'none',
      ).length,
      teamRollups: [...rollups.values()],
      periodStatus:
        (periodRun?.status as IncentivePerformanceReport['periodStatus']) ??
        'live',
    };
    return this.scopePerformance(
      report,
      await this.resolveViewerScope(organizationId, viewer),
    );
  }

  async listPeriods(
    organizationId: string,
    viewer?: IncentiveViewer,
  ): Promise<IncentivePeriodRun[]> {
    const rows = await this.prisma.incentivePeriodRun.findMany({
      where: { organizationId },
      orderBy: { yearMonth: 'desc' },
      include: {
        lines: { orderBy: [{ teamName: 'asc' }, { agentName: 'asc' }] },
      },
    });
    const scope = await this.resolveViewerScope(organizationId, viewer);
    return rows.map((row) => this.scopePeriod(this.toPeriod(row), scope));
  }

  async getPeriod(
    organizationId: string,
    yearMonth: string,
    viewer?: IncentiveViewer,
  ): Promise<IncentivePeriodRun> {
    const ym = this.validateYearMonth(yearMonth);
    const row = await this.prisma.incentivePeriodRun.findUnique({
      where: { organizationId_yearMonth: { organizationId, yearMonth: ym } },
      include: {
        lines: { orderBy: [{ teamName: 'asc' }, { agentName: 'asc' }] },
      },
    });
    if (!row) throw new NotFoundException('Incentive period not found');
    return this.scopePeriod(
      this.toPeriod(row),
      await this.resolveViewerScope(organizationId, viewer),
    );
  }

  async generatePeriod(
    organizationId: string,
    yearMonth: string,
    user: { userId: string; name?: string; email: string },
  ): Promise<IncentivePeriodRun> {
    const ym = this.validateYearMonth(yearMonth);
    const report = await this.performance(organizationId, ym);
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.incentivePeriodRun.findUnique({
        where: { organizationId_yearMonth: { organizationId, yearMonth: ym } },
      });
      if (existing?.status === 'paid') {
        throw new ConflictException(
          'Paid incentive periods cannot be regenerated',
        );
      }
      if (existing?.status === 'approved') {
        throw new ConflictException(
          'Approved incentive periods cannot be regenerated',
        );
      }
      const lineData = report.lines.map((line) => ({
        assignmentId: line.assignmentId,
        agentName: line.agentName,
        planId: line.planId,
        planName: line.planName,
        teamName: line.teamName ?? null,
        metricType: line.metricType,
        actualValue: line.actualValue,
        incentiveBdt: line.incentiveBdt,
        specialBonusBdt: line.specialBonusBdt ?? 0,
        attendanceBonusBdt: line.attendanceBonusBdt ?? 0,
        totalPayBdt: line.totalPayBdt ?? line.incentiveBdt,
        matchedSlabLabel: line.matchedSlabLabel ?? null,
        warning: line.warning ?? null,
        hrStatus: line.hrStatus ?? null,
        notes: line.notes ?? null,
      }));
      for (const line of report.lines) {
        const terminated = line.hrStatus === 'terminated';
        await tx.incentiveAssignment.updateMany({
          where: { id: line.assignmentId, organizationId },
          data: {
            consecutiveMissMonths: line.consecutiveMissMonths ?? 0,
            hrStatus: line.hrStatus ?? 'active',
            ...(terminated
              ? { isActive: false, endsOn: this.periodBounds(ym).end }
              : {}),
          },
        });
      }
      if (existing) {
        await tx.incentivePayoutLine.deleteMany({
          where: { runId: existing.id },
        });
        await tx.incentivePeriodRun.update({
          where: { id: existing.id },
          data: {
            status: 'draft',
            totalIncentiveBdt: report.totalIncentiveBdt,
            totalSpecialBonusBdt: report.totalSpecialBonusBdt ?? 0,
            totalAttendanceBonusBdt: report.totalAttendanceBonusBdt ?? 0,
            totalPayBdt: report.totalPayBdt ?? report.totalIncentiveBdt,
            calculatedAt: new Date(),
            lines: { create: lineData },
          },
        });
      } else {
        await tx.incentivePeriodRun.create({
          data: {
            organizationId,
            yearMonth: ym,
            status: 'draft',
            totalIncentiveBdt: report.totalIncentiveBdt,
            totalSpecialBonusBdt: report.totalSpecialBonusBdt ?? 0,
            totalAttendanceBonusBdt: report.totalAttendanceBonusBdt ?? 0,
            totalPayBdt: report.totalPayBdt ?? report.totalIncentiveBdt,
            calculatedAt: new Date(),
            notes: `Generated by ${user.name?.trim() || user.email}`,
            lines: { create: lineData },
          },
        });
      }
    });
    return this.getPeriod(organizationId, ym);
  }

  async approvePeriod(
    organizationId: string,
    yearMonth: string,
    user: { userId: string; name?: string; email: string },
  ): Promise<IncentivePeriodRun> {
    return this.transitionPeriod(
      organizationId,
      yearMonth,
      'draft',
      'approved',
      user,
    );
  }

  async markPeriodPaid(
    organizationId: string,
    yearMonth: string,
    user: { userId: string; name?: string; email: string },
  ): Promise<IncentivePeriodRun> {
    const paid = await this.transitionPeriod(
      organizationId,
      yearMonth,
      'approved',
      'paid',
      user,
    );
    // Audit trail on notes (CRM owns calc + lock; finance pays externally)
    const stamp = `Paid marked by ${user.name?.trim() || user.email} at ${new Date().toISOString()}`;
    await this.prisma.incentivePeriodRun.update({
      where: { id: paid.id },
      data: {
        notes: paid.notes ? `${paid.notes}\n${stamp}` : stamp,
      },
    });
    return this.getPeriod(organizationId, yearMonth);
  }

  /**
   * Agent / TL dashboard: live incentive summary for the signed-in user.
   */
  async mySummary(
    organizationId: string,
    actor: { userId: string; name?: string | null },
    yearMonth?: string,
  ): Promise<{
    totalEarned: number;
    periodLabel: string;
    breakdown: Array<{ id: string; label: string; amount: number }>;
    nextPayoutDate: string;
    history: Array<{
      id: string;
      date: string;
      description: string;
      type: string;
      amount: number;
    }>;
  }> {
    const ym = yearMonth?.trim() || this.currentYearMonth();
    const report = await this.performance(organizationId, ym);
    const nameKey = (actor.name ?? '').trim().toLowerCase();

    const assignments = await this.prisma.incentiveAssignment.findMany({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { userId: actor.userId },
          ...(actor.name?.trim()
            ? [
                {
                  agentName: {
                    equals: actor.name.trim(),
                    mode: 'insensitive' as const,
                  },
                },
              ]
            : []),
        ],
      },
      select: { id: true },
    });
    const assignmentIds = new Set(assignments.map((a) => a.id));
    const mine = report.lines.filter((line) => assignmentIds.has(line.assignmentId));
    const fallback = report.lines.filter(
      (line) => nameKey && line.agentName.trim().toLowerCase() === nameKey,
    );
    const useLines = mine.length ? mine : fallback;
    const totalEarned = useLines.reduce((s, l) => s + (l.totalPayBdt ?? l.incentiveBdt), 0);
    const breakdown = useLines.map((l) => ({
      id: l.assignmentId,
      label: l.planName,
      amount: l.totalPayBdt ?? l.incentiveBdt,
    }));

    const periods = await this.prisma.incentivePeriodRun.findMany({
      where: { organizationId, status: { in: ['paid', 'approved'] } },
      orderBy: { yearMonth: 'desc' },
      take: 6,
      include: { lines: true },
    });
    const history = periods.flatMap((p) => {
      const agentLines = p.lines.filter((l) => {
        if (assignmentIds.size && l.assignmentId && assignmentIds.has(l.assignmentId)) {
          return true;
        }
        return nameKey && l.agentName.trim().toLowerCase() === nameKey;
      });
      return agentLines.map((l) => ({
        id: `${p.id}-${l.id}`,
        date: `${p.yearMonth}-01`,
        description: `${l.planName} · ${p.yearMonth}`,
        type: p.status,
        amount: l.totalPayBdt ?? l.incentiveBdt,
      }));
    });

    const [y, m] = ym.split('-').map(Number);
    const nextPayout = new Date(Date.UTC(y!, m!, 5)); // 5th of next month convention
    return {
      totalEarned,
      periodLabel: ym,
      breakdown,
      nextPayoutDate: nextPayout.toISOString().slice(0, 10),
      history,
    };
  }

  async exportPayrollCsv(
    organizationId: string,
    yearMonth: string,
  ): Promise<{ filename: string; csv: string }> {
    const ym = this.validateYearMonth(yearMonth);
    const period = await this.prisma.incentivePeriodRun.findUnique({
      where: { organizationId_yearMonth: { organizationId, yearMonth: ym } },
      include: { lines: { orderBy: { agentName: 'asc' } } },
    });
    if (!period) {
      throw new NotFoundException(`No incentive period for ${ym}`);
    }
    if (period.status === 'draft') {
      throw new BadRequestException('Approve the period before payroll export');
    }

    const assignments = await this.prisma.incentiveAssignment.findMany({
      where: {
        organizationId,
        id: { in: period.lines.map((l) => l.assignmentId).filter(Boolean) as string[] },
      },
      select: { id: true, userId: true },
    });
    const userByAssignment = new Map(
      assignments.map((a) => [a.id, a.userId ?? ''] as const),
    );

    const header = [
      'yearMonth',
      'periodStatus',
      'agentName',
      'userId',
      'planName',
      'teamName',
      'metricType',
      'actualValue',
      'incentiveBdt',
      'attendanceBonusBdt',
      'specialBonusBdt',
      'totalPayBdt',
      'hrStatus',
    ];
    const rows = period.lines.map((l) =>
      [
        ym,
        period.status,
        l.agentName,
        l.assignmentId ? userByAssignment.get(l.assignmentId) ?? '' : '',
        l.planName,
        l.teamName ?? '',
        l.metricType,
        l.actualValue,
        l.incentiveBdt,
        l.attendanceBonusBdt,
        l.specialBonusBdt,
        l.totalPayBdt,
        l.hrStatus ?? '',
      ]
        .map((cell) => {
          const text = String(cell ?? '');
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(','),
    );
    return {
      filename: `incentive-payroll-${ym}.csv`,
      csv: [header.join(','), ...rows].join('\n'),
    };
  }

  private currentYearMonth(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  // --- calc helpers ---

  private ordersForAssignment(
    assignment: { userId?: string | null; agentName: string },
    month: string,
    ordersByKeyMonth: Map<string, IncentiveOrderRow[]>,
  ): IncentiveOrderRow[] {
    const seen = new Set<string>();
    const out: IncentiveOrderRow[] = [];
    for (const key of assignmentMatchKeys(assignment)) {
      for (const order of ordersByKeyMonth.get(`${key}\u0000${month}`) ?? []) {
        if (seen.has(order.id)) continue;
        seen.add(order.id);
        out.push(order);
      }
    }
    return out;
  }

  private calcLine(
    assignment: AssignmentRow & {
      plan: PlanWithSlabs;
    },
    orders: IncentiveOrderRow[],
    manualActual?: number,
    surveyCount = 0,
    channelLogs: { channel: string; activityCount: number }[] = [],
    workingDaysInMonth = 0,
    statusActivities: IncentiveStatusActivity[] = [],
    periodStart = new Date(0),
    periodEnd = new Date(),
  ): IncentivePerformanceLine {
    const plan = assignment.plan;
    const metricType = plan.metricType as IncentiveMetricType;
    const config = this.parseConfig(plan.metricConfig);
    const direction = this.directionFor(metricType, config);

    let actualValue = 0;
    let notes: string | undefined;

    if (metricType === 'manual') {
      if (manualActual === undefined) {
        notes = 'Manual actual is required for this period';
      } else {
        actualValue = manualActual;
      }
    }

    if (metricType === 'survey_count') {
      actualValue = surveyCount;
    } else if (metricType === 'channel_activity') {
      const configuredChannels = config.channels?.length
        ? new Set(config.channels)
        : null;
      actualValue = channelLogs.reduce(
        (sum, row) =>
          configuredChannels &&
          !configuredChannels.has(
            row.channel as NonNullable<
              IncentiveMetricConfig['channels']
            >[number],
          )
            ? sum
            : sum + row.activityCount,
        0,
      );
    } else if (metricType === 'return_ratio') {
      const deliveredStatuses = (
        config.deliveredStatuses ?? [
          'delivered',
          'completed',
          'hand_delivery_completed',
        ]
      ).map((s) => s.toLowerCase());
      const returnedStatuses = (
        config.returnedStatuses ?? ['returned', 'pending_return']
      ).map((s) => s.toLowerCase());
      let delivered = 0;
      let returned = 0;
      for (const o of orders) {
        const st = o.status.toLowerCase();
        if (deliveredStatuses.includes(st)) delivered += 1;
        if (returnedStatuses.includes(st)) returned += 1;
      }
      actualValue = computeReturnRatioPct({ delivered, returned });
    } else if (metricType === 'cross_sell_count') {
      const minItems = config.minItems ?? 2;
      const exclude = new Set(
        (
          config.excludeStatuses ?? [
            'cancelled',
            'canceled',
            'failed',
            'duplicate',
          ]
        ).map((s) => s.toLowerCase()),
      );
      const include = config.includeStatuses?.map((s) => s.toLowerCase());
      const orderTags = new Set(
        (config.orderTags ?? []).map((tag) => tag.toLowerCase()),
      );
      actualValue = orders.filter((o) => {
        const st = o.status.toLowerCase();
        if (exclude.has(st)) return false;
        if (include?.length && !include.includes(st)) return false;
        return (
          o.itemsCount >= minItems ||
          (!!o.orderTag && orderTags.has(o.orderTag.toLowerCase()))
        );
      }).length;
    } else if (metricType === 'recovery_count') {
      const successStatuses = (
        config.includeStatuses ?? [
          'confirmed',
          'delivered',
          'completed',
          'in_courier',
        ]
      ).map((s) => s.toLowerCase());
      const recoveryFromStatuses = (
        config.recoveryFromStatuses ?? [
          'pending',
          'hold_followup',
          'incomplete',
          'pending_incomplete',
        ]
      ).map((s) => s.toLowerCase());
      const tags = new Map(
        orders.map((o) => [o.id, o.orderTag] as const),
      );
      actualValue = countRecoveries({
        orderIds: orders.map((o) => o.id),
        activities: statusActivities,
        successStatuses,
        recoveryFromStatuses,
        periodStart,
        periodEnd,
        orderTagsById: tags,
      });
    } else if (metricType !== 'manual') {
      // order_count
      const exclude = new Set(
        (
          config.excludeStatuses ?? [
            'cancelled',
            'canceled',
            'failed',
            'duplicate',
          ]
        ).map((s) => s.toLowerCase()),
      );
      const include = (
        config.includeStatuses ?? [
          'confirmed',
          'delivered',
          'completed',
          'in_courier',
        ]
      ).map((s) => s.toLowerCase());
      actualValue = orders.filter((o) => {
        const st = o.status.toLowerCase();
        if (exclude.has(st)) return false;
        return include.includes(st);
      }).length;
    }

    let match = matchIncentiveSlab(
      plan.slabs,
      actualValue,
      direction,
      plan.prorataAboveTop,
    );

    // Personal return-ratio quality gate (PDF) — applies to order-like metrics.
    let returnCapped = false;
    if (
      metricType !== 'return_ratio' &&
      metricType !== 'manual' &&
      metricType !== 'survey_count' &&
      metricType !== 'channel_activity' &&
      config.maxAgentReturnRatioPct != null
    ) {
      const deliveredStatuses = (
        config.deliveredStatuses ?? [
          'delivered',
          'completed',
          'hand_delivery_completed',
        ]
      ).map((s) => s.toLowerCase());
      const returnedStatuses = (
        config.returnedStatuses ?? ['returned', 'pending_return']
      ).map((s) => s.toLowerCase());
      let delivered = 0;
      let returned = 0;
      for (const o of orders) {
        const st = o.status.toLowerCase();
        if (deliveredStatuses.includes(st)) delivered += 1;
        if (returnedStatuses.includes(st)) returned += 1;
      }
      const returnRatioPct = computeReturnRatioPct({ delivered, returned });
      const capped = applyReturnRatioCap({
        incentiveBdt: match.incentiveBdt,
        returnRatioPct,
        maxAgentReturnRatioPct: config.maxAgentReturnRatioPct,
      });
      if (capped.capped) {
        returnCapped = true;
        match = { ...match, incentiveBdt: 0 };
        notes = [
          notes,
          `Return ratio ${returnRatioPct}% exceeds plan max ${config.maxAgentReturnRatioPct}% — incentive zeroed`,
        ]
          .filter(Boolean)
          .join('. ');
      }
    }

    const entryTarget =
      direction === 'higher' && plan.slabs.length
        ? Math.min(...plan.slabs.map((slab) => slab.monthlyTarget))
        : null;
    const manualMissing = metricType === 'manual' && manualActual === undefined;
    const missed = evaluateMiss(direction, actualValue, plan.slabs);
    const dailyAverage =
      workingDaysInMonth > 0 && direction === 'higher'
        ? Math.round((actualValue / workingDaysInMonth) * 100) / 100
        : null;
    const belowDailyEntry =
      config.entryDailyTarget != null &&
      dailyAverage != null &&
      dailyAverage < config.entryDailyTarget;
    const warning = returnCapped
      ? 'above_return_cap'
      : manualMissing
        ? 'manual_missing'
        : belowDailyEntry
          ? 'below_daily_entry'
          : missed
            ? direction === 'higher'
              ? 'below_target'
              : 'above_return_cap'
            : 'none';

    return {
      assignmentId: assignment.id,
      agentName: assignment.agentName,
      userId: assignment.userId,
      planId: plan.id,
      planName: plan.name,
      teamName: plan.orgTeam?.name ?? plan.team?.name,
      metricType,
      actualValue,
      matchedSlabId: match.slab?.id ?? null,
      matchedSlabLabel: match.slab?.label ?? null,
      monthlyTarget: match.slab?.monthlyTarget ?? null,
      entryTarget,
      dailyAverage,
      incentiveBdt: match.incentiveBdt,
      prorataApplied: match.prorataApplied,
      manualOverride: metricType === 'manual' && manualActual !== undefined,
      warning,
      notes,
    };
  }

  private directionFor(
    metricType: IncentiveMetricType,
    config: IncentiveMetricConfig,
  ): 'higher' | 'lower' {
    if (config.direction) return config.direction;
    return metricType === 'return_ratio' ? 'lower' : 'higher';
  }

  // --- mappers ---

  private toPlan(row: PlanWithSlabs): IncentivePlan {
    return {
      id: row.id,
      teamId: row.orgTeamId ?? row.teamId,
      teamName: row.orgTeam?.name ?? row.team?.name,
      name: row.name,
      slug: row.slug,
      description: row.description ?? undefined,
      metricType: row.metricType as IncentiveMetricType,
      metricConfig: this.parseConfig(row.metricConfig),
      teamMonthlyTarget: row.teamMonthlyTarget,
      periodType: 'monthly',
      isActive: row.isActive,
      prorataAboveTop: row.prorataAboveTop,
      sortOrder: row.sortOrder,
      slabs: row.slabs.map((s) => this.toSlab(s)),
      assignmentCount: row._count?.assignments,
    };
  }

  private toSlab(row: SlabRow): IncentiveSlab {
    return {
      id: row.id,
      label: row.label ?? undefined,
      dailyTarget: row.dailyTarget,
      monthlyTarget: row.monthlyTarget,
      incentiveBdt: row.incentiveBdt,
      sortOrder: row.sortOrder,
    };
  }

  private toAssignment(
    row: AssignmentRow,
    planName?: string,
    teamName?: string,
  ): IncentiveAssignment {
    return {
      id: row.id,
      planId: row.planId,
      planName,
      teamName,
      agentName: row.agentName,
      userId: row.userId,
      shift: row.shift,
      startsOn: row.startsOn.toISOString().slice(0, 10),
      endsOn: row.endsOn ? row.endsOn.toISOString().slice(0, 10) : null,
      isActive: row.isActive,
      hrStatus: row.hrStatus as IncentiveAssignment['hrStatus'],
      consecutiveMissMonths: row.consecutiveMissMonths,
    };
  }

  private slabCreates(slabs: IncentiveSlabInput[]) {
    return slabs.map((s, i) => ({
      label: s.label?.trim() || null,
      dailyTarget: s.dailyTarget ?? null,
      monthlyTarget: s.monthlyTarget,
      incentiveBdt: s.incentiveBdt,
      sortOrder: s.sortOrder ?? i,
    }));
  }

  private parseConfig(raw: unknown): IncentiveMetricConfig {
    if (!raw || typeof raw !== 'object') return {};
    return raw as IncentiveMetricConfig;
  }

  private parseSalary(raw: unknown): IncentiveSalaryTemplate | null {
    if (!raw || typeof raw !== 'object') return null;
    return raw as IncentiveSalaryTemplate;
  }

  private parseShifts(raw: unknown): IncentiveShiftTemplate[] {
    if (!Array.isArray(raw)) return [];
    return raw as IncentiveShiftTemplate[];
  }

  private toPeriod(
    row: PeriodRow & { lines: PayoutRow[] },
  ): IncentivePeriodRun {
    return {
      id: row.id,
      yearMonth: row.yearMonth,
      status: row.status as IncentivePeriodRun['status'],
      totalIncentiveBdt: row.totalIncentiveBdt,
      totalSpecialBonusBdt: row.totalSpecialBonusBdt,
      totalAttendanceBonusBdt: row.totalAttendanceBonusBdt,
      totalPayBdt: row.totalPayBdt,
      calculatedAt: row.calculatedAt.toISOString(),
      approvedAt: row.approvedAt?.toISOString() ?? null,
      approvedByName: row.approvedByName,
      paidAt: row.paidAt?.toISOString() ?? null,
      paidByName: row.paidByName,
      notes: row.notes,
      lines: row.lines.map((line) => ({
        id: line.id,
        assignmentId: line.assignmentId,
        agentName: line.agentName,
        planId: line.planId,
        planName: line.planName,
        teamName: line.teamName ?? undefined,
        metricType: line.metricType as IncentiveMetricType,
        actualValue: line.actualValue,
        incentiveBdt: line.incentiveBdt,
        specialBonusBdt: line.specialBonusBdt,
        attendanceBonusBdt: line.attendanceBonusBdt,
        totalPayBdt: line.totalPayBdt,
        matchedSlabLabel: line.matchedSlabLabel,
        warning:
          (line.warning as IncentivePeriodRun['lines'][number]['warning']) ??
          undefined,
        hrStatus:
          (line.hrStatus as IncentivePeriodRun['lines'][number]['hrStatus']) ??
          undefined,
        notes: line.notes ?? undefined,
      })),
    };
  }

  private async resolveViewerScope(
    organizationId: string,
    viewer?: IncentiveViewer,
  ): Promise<ViewerScope> {
    if (!viewer || viewer.manage) {
      return {
        full: true,
        assignmentIds: new Set(),
        planIds: new Set(),
        userIds: new Set(),
        nameKeys: new Set(),
      };
    }

    const userIds = new Set<string>([viewer.userId]);
    const nameKeys = new Set<string>();
    const selfName = normalizeAgentKey(viewer.name);
    if (selfName) nameKeys.add(selfName);

    if (viewer.systemRole === 'team_leader') {
      const me = await this.prisma.user.findFirst({
        where: { id: viewer.userId, organizationId },
        select: { teamId: true },
      });
      if (me?.teamId) {
        const mates = await this.prisma.user.findMany({
          where: { organizationId, teamId: me.teamId, status: 'active' },
          select: { id: true, name: true },
        });
        for (const mate of mates) {
          userIds.add(mate.id);
          const key = normalizeAgentKey(mate.name);
          if (key) nameKeys.add(key);
        }
      }
    }

    const nameList = [...nameKeys];
    const assignments = await this.prisma.incentiveAssignment.findMany({
      where: {
        organizationId,
        OR: [
          { userId: { in: [...userIds] } },
          ...(nameList.length
            ? nameList.map((name) => ({
                agentName: { equals: name, mode: 'insensitive' as const },
              }))
            : []),
        ],
      },
      select: { id: true, planId: true },
    });

    return {
      full: false,
      assignmentIds: new Set(assignments.map((row) => row.id)),
      planIds: new Set(assignments.map((row) => row.planId)),
      userIds,
      nameKeys,
    };
  }

  private inAssignmentScope(
    row: { id: string; userId?: string | null; agentName: string },
    scope: ViewerScope,
  ): boolean {
    if (scope.full) return true;
    if (scope.assignmentIds.has(row.id)) return true;
    if (row.userId && scope.userIds.has(row.userId)) return true;
    return scope.nameKeys.has(normalizeAgentKey(row.agentName));
  }

  private inLineScope(
    line: { assignmentId?: string | null; agentName: string },
    scope: ViewerScope,
  ): boolean {
    if (scope.full) return true;
    if (line.assignmentId && scope.assignmentIds.has(line.assignmentId)) {
      return true;
    }
    return scope.nameKeys.has(normalizeAgentKey(line.agentName));
  }

  private inOpsScope(
    row: {
      assignmentId?: string | null;
      userId?: string | null;
      agentName: string;
    },
    scope: ViewerScope,
  ): boolean {
    if (scope.full) return true;
    if (row.assignmentId && scope.assignmentIds.has(row.assignmentId)) {
      return true;
    }
    if (row.userId && scope.userIds.has(row.userId)) return true;
    return scope.nameKeys.has(normalizeAgentKey(row.agentName));
  }

  private scopePerformance(
    report: IncentivePerformanceReport,
    scope: ViewerScope,
  ): IncentivePerformanceReport {
    if (scope.full) return report;
    const lines = report.lines.filter((line) => this.inLineScope(line, scope));
    return {
      ...report,
      lines,
      totalIncentiveBdt: lines.reduce((sum, line) => sum + line.incentiveBdt, 0),
      totalSpecialBonusBdt: lines.reduce(
        (sum, line) => sum + (line.specialBonusBdt ?? 0),
        0,
      ),
      totalAttendanceBonusBdt: lines.reduce(
        (sum, line) => sum + (line.attendanceBonusBdt ?? 0),
        0,
      ),
      totalPayBdt: lines.reduce(
        (sum, line) => sum + (line.totalPayBdt ?? 0),
        0,
      ),
      warningCount: lines.filter(
        (line) => line.warning && line.warning !== 'none',
      ).length,
      teamRollups: report.teamRollups?.filter((rollup) =>
        lines.some((line) => line.planId === rollup.planId),
      ),
    };
  }

  private scopePeriod(
    period: IncentivePeriodRun,
    scope: ViewerScope,
  ): IncentivePeriodRun {
    if (scope.full) return period;
    const lines = period.lines.filter((line) => this.inLineScope(line, scope));
    return {
      ...period,
      lines,
      totalIncentiveBdt: lines.reduce((sum, line) => sum + line.incentiveBdt, 0),
      totalSpecialBonusBdt: lines.reduce(
        (sum, line) => sum + (line.specialBonusBdt ?? 0),
        0,
      ),
      totalAttendanceBonusBdt: lines.reduce(
        (sum, line) => sum + (line.attendanceBonusBdt ?? 0),
        0,
      ),
      totalPayBdt: lines.reduce(
        (sum, line) => sum + (line.totalPayBdt ?? line.incentiveBdt),
        0,
      ),
    };
  }

  private scopeOps(ops: IncentiveOpsMonth, scope: ViewerScope): IncentiveOpsMonth {
    if (scope.full) return ops;
    return {
      ...ops,
      attendance: ops.attendance.filter((row) => this.inOpsScope(row, scope)),
      surveys: ops.surveys.filter((row) => this.inOpsScope(row, scope)),
      channels: ops.channels.filter((row) => this.inOpsScope(row, scope)),
      specialBonuses: ops.specialBonuses.filter((row) =>
        this.inOpsScope(row, scope),
      ),
    };
  }

  private async transitionPeriod(
    organizationId: string,
    yearMonth: string,
    fromStatus: 'draft' | 'approved',
    toStatus: 'approved' | 'paid',
    user: { userId: string; name?: string; email: string },
  ): Promise<IncentivePeriodRun> {
    const ym = this.validateYearMonth(yearMonth);
    const existing = await this.prisma.incentivePeriodRun.findUnique({
      where: { organizationId_yearMonth: { organizationId, yearMonth: ym } },
    });
    if (!existing) throw new NotFoundException('Incentive period not found');
    if (existing.status !== fromStatus) {
      throw new ConflictException(
        `Only ${fromStatus} incentive periods can be marked ${toStatus}`,
      );
    }
    const actorName = user.name?.trim() || user.email;
    await this.prisma.incentivePeriodRun.update({
      where: { id: existing.id },
      data:
        toStatus === 'approved'
          ? {
              status: 'approved',
              approvedAt: new Date(),
              approvedByUserId: user.userId,
              approvedByName: actorName,
            }
          : {
              status: 'paid',
              paidAt: new Date(),
              paidByUserId: user.userId,
              paidByName: actorName,
            },
    });
    return this.getPeriod(organizationId, ym);
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64);
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const d = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime()))
      throw new BadRequestException(`Invalid date: ${value}`);
    return d;
  }

  private startOfMonth(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }

  private validateYearMonth(value: string): string {
    const ym = value.trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) {
      throw new BadRequestException('yearMonth must be YYYY-MM');
    }
    return ym;
  }

  private periodBounds(yearMonth: string): { start: Date; end: Date } {
    const [year, month] = yearMonth.split('-').map(Number) as [number, number];
    return {
      start: new Date(Date.UTC(year, month - 1, 1)),
      end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
    };
  }

  private offsetYearMonth(yearMonth: string, offset: number): string {
    const [year, month] = yearMonth.split('-').map(Number) as [number, number];
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    return this.toYearMonth(date);
  }

  private toYearMonth(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private assignmentActiveInMonth(
    assignment: AssignmentRow,
    yearMonth: string,
  ): boolean {
    const { start, end } = this.periodBounds(yearMonth);
    return (
      assignment.startsOn <= end &&
      (!assignment.endsOn || assignment.endsOn >= start)
    );
  }

  private attendanceEligible(row: {
    presentDays: number;
    workingDays: number;
    lateCount: number;
    earlyLeaveCount: number;
    unapprovedAbsence: number;
  }): boolean {
    return (
      row.presentDays >= row.workingDays &&
      row.lateCount === 0 &&
      row.earlyLeaveCount === 0 &&
      row.unapprovedAbsence === 0
    );
  }

  private weekdaysInMonth(monthStart: Date): number {
    const year = monthStart.getUTCFullYear();
    const month = monthStart.getUTCMonth();
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    let weekdays = 0;
    for (let day = 1; day <= days; day += 1) {
      const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();
      if (weekday !== 0 && weekday !== 6) weekdays += 1;
    }
    return weekdays;
  }

  private hrStatusForMisses(
    consecutiveMissMonths: number,
  ): IncentivePerformanceLine['hrStatus'] {
    if (consecutiveMissMonths >= 3) return 'terminated';
    if (consecutiveMissMonths === 2) return 'final_warning';
    if (consecutiveMissMonths === 1) return 'warning';
    return 'active';
  }

  private async assertNoOverlappingAssignment(
    organizationId: string,
    candidate: {
      planId: string;
      agentName: string;
      startsOn: Date;
      endsOn: Date | null;
      isActive: boolean;
    },
    excludeId?: string,
  ): Promise<void> {
    if (!candidate.isActive) return;
    if (candidate.endsOn && candidate.endsOn < candidate.startsOn) {
      throw new BadRequestException(
        'Assignment end date cannot be before start date',
      );
    }
    const overlap = await this.prisma.incentiveAssignment.findFirst({
      where: {
        organizationId,
        planId: candidate.planId,
        agentName: { equals: candidate.agentName, mode: 'insensitive' },
        isActive: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startsOn: candidate.endsOn ? { lte: candidate.endsOn } : undefined,
        OR: [{ endsOn: null }, { endsOn: { gte: candidate.startsOn } }],
      },
      select: { id: true },
    });
    if (overlap) {
      throw new ConflictException(
        'An overlapping active assignment already exists for this agent and plan',
      );
    }
  }

  private async loadHubTeams(
    organizationId: string,
  ): Promise<IncentiveTeam[]> {
    const orgTeams = await this.prisma.team.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      include: {
        members: { select: { id: true } },
      },
    });
    const plans = await this.prisma.incentivePlan.findMany({
      where: { organizationId, orgTeamId: { not: null } },
      select: { id: true, orgTeamId: true },
    });
    const planByTeam = new Map(
      plans.map((p) => [p.orgTeamId as string, p.id] as const),
    );
    return orgTeams.map((team, index) => {
      const memberIds = new Set(team.members.map((m) => m.id));
      memberIds.add(team.leaderUserId);
      const planId = planByTeam.get(team.id) ?? null;
      return {
        id: team.id,
        name: team.name,
        slug: this.slugify(team.name),
        sortOrder: index,
        isActive: true,
        planCount: planId ? 1 : 0,
        memberCount: memberIds.size,
        planId,
        hasStructure: Boolean(planId),
      };
    });
  }

  private matchSeedOrgTeam<T extends { id: string; name: string }>(
    orgTeams: T[],
    seed: { name: string; slug: string },
  ): T | undefined {
    const seedSlug = this.slugify(seed.slug || seed.name);
    const seedNameSlug = this.slugify(seed.name);
    return orgTeams.find((team) => {
      const teamSlug = this.slugify(team.name);
      return teamSlug === seedSlug || teamSlug === seedNameSlug;
    });
  }

  private async upsertSeedSettings(organizationId: string) {
    const existing = await this.prisma.incentiveOrgSettings.findUnique({
      where: { organizationId },
    });
    if (existing) return;
    await this.prisma.incentiveOrgSettings.create({
      data: {
        organizationId,
        salaryTemplate:
          LAAM_INCENTIVE_SEED.salary as unknown as Prisma.InputJsonValue,
        shiftTemplates:
          LAAM_INCENTIVE_SEED.shifts as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private async attachSeedPlansToOrgTeams(
    organizationId: string,
    orgTeams: Array<{ id: string; name: string }>,
  ) {
    for (const [index, seed] of LAAM_INCENTIVE_SEED.teams.entries()) {
      if (!seed.plan) continue;
      const match = this.matchSeedOrgTeam(orgTeams, seed);
      if (!match) continue;
      const existingForTeam = await this.prisma.incentivePlan.findFirst({
        where: { organizationId, orgTeamId: match.id },
      });
      if (existingForTeam) continue;
      const slugTaken = await this.prisma.incentivePlan.findUnique({
        where: {
          organizationId_slug: { organizationId, slug: seed.plan.slug },
        },
      });
      const slug = slugTaken
        ? `${seed.plan.slug}-${match.id.slice(0, 8)}`
        : seed.plan.slug;
      await this.prisma.incentivePlan.create({
        data: {
          organizationId,
          teamId: null,
          orgTeamId: match.id,
          name: seed.plan.name,
          slug,
          description: seed.plan.description,
          metricType: seed.plan.metricType,
          metricConfig: seed.plan.metricConfig as
            | Prisma.InputJsonValue
            | undefined,
          teamMonthlyTarget: seed.plan.teamMonthlyTarget ?? null,
          prorataAboveTop: seed.plan.prorataAboveTop ?? false,
          sortOrder: index,
          isActive: true,
          slabs: {
            create: seed.plan.slabs.map((slab, slabIndex) => ({
              label: slab.label ?? null,
              dailyTarget:
                'dailyTarget' in slab ? (slab.dailyTarget ?? null) : null,
              monthlyTarget: slab.monthlyTarget,
              incentiveBdt: slab.incentiveBdt,
              sortOrder: slabIndex,
            })),
          },
        },
      });
    }
  }

  private async backfillOrgTeamLinks(organizationId: string) {
    const orgTeams = await this.prisma.team.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });
    if (!orgTeams.length) return;

    const taken = new Set(
      (
        await this.prisma.incentivePlan.findMany({
          where: { organizationId, orgTeamId: { not: null } },
          select: { orgTeamId: true },
        })
      )
        .map((p) => p.orgTeamId)
        .filter((id): id is string => Boolean(id)),
    );

    const unlinked = await this.prisma.incentivePlan.findMany({
      where: { organizationId, orgTeamId: null },
      include: { team: true },
    });

    for (const plan of unlinked) {
      const seed = LAAM_INCENTIVE_SEED.teams.find(
        (row) => row.plan?.slug === plan.slug,
      );
      const bySeed = seed
        ? this.matchSeedOrgTeam(orgTeams, seed)
        : undefined;
      const byLegacyName = plan.team?.name
        ? this.matchSeedOrgTeam(orgTeams, {
            name: plan.team.name,
            slug: this.slugify(plan.team.name),
          })
        : undefined;
      const byPlanName = this.matchSeedOrgTeam(orgTeams, {
        name: plan.name,
        slug: this.slugify(plan.name),
      });
      const match = bySeed ?? byLegacyName ?? byPlanName;
      if (!match || taken.has(match.id)) continue;
      await this.prisma.incentivePlan.update({
        where: { id: plan.id },
        data: { orgTeamId: match.id },
      });
      taken.add(match.id);
    }
  }

  private async syncOrgTeamAssignments(organizationId: string) {
    const plans = await this.prisma.incentivePlan.findMany({
      where: {
        organizationId,
        isActive: true,
        orgTeamId: { not: null },
      },
      select: { id: true, orgTeamId: true },
    });
    const startsOn = new Date(Date.UTC(2000, 0, 1));

    for (const plan of plans) {
      const orgTeam = await this.prisma.team.findFirst({
        where: { id: plan.orgTeamId!, organizationId },
        include: {
          members: { select: { id: true, name: true } },
          leader: { select: { id: true, name: true } },
        },
      });
      if (!orgTeam) continue;

      const users = new Map<string, { id: string; name: string }>();
      users.set(orgTeam.leader.id, {
        id: orgTeam.leader.id,
        name: orgTeam.leader.name,
      });
      for (const member of orgTeam.members) {
        users.set(member.id, { id: member.id, name: member.name });
      }

      const existing = await this.prisma.incentiveAssignment.findMany({
        where: { organizationId, planId: plan.id },
      });
      const byUserId = new Map(
        existing
          .filter((row) => row.userId)
          .map((row) => [row.userId as string, row]),
      );

      for (const user of users.values()) {
        const current = byUserId.get(user.id);
        if (current) {
          if (!current.isActive || current.agentName !== user.name) {
            await this.prisma.incentiveAssignment.update({
              where: { id: current.id },
              data: {
                isActive: true,
                agentName: user.name,
                hrStatus:
                  current.hrStatus === 'terminated'
                    ? current.hrStatus
                    : 'active',
              },
            });
          }
          continue;
        }
        const nameMatch = existing.find(
          (row) =>
            !row.userId &&
            this.slugify(row.agentName) === this.slugify(user.name),
        );
        if (nameMatch) {
          await this.prisma.incentiveAssignment.update({
            where: { id: nameMatch.id },
            data: { userId: user.id, isActive: true, agentName: user.name },
          });
          continue;
        }
        await this.prisma.incentiveAssignment.create({
          data: {
            organizationId,
            planId: plan.id,
            agentName: user.name,
            userId: user.id,
            startsOn,
            isActive: true,
            hrStatus: 'active',
          },
        });
      }

      for (const row of existing) {
        if (row.userId && !users.has(row.userId) && row.isActive) {
          await this.prisma.incentiveAssignment.update({
            where: { id: row.id },
            data: { isActive: false },
          });
        }
      }
    }
  }

  private async requireOrgTeam(organizationId: string, id: string) {
    const row = await this.prisma.team.findFirst({
      where: { id, organizationId },
    });
    if (!row) {
      throw new NotFoundException(
        'Team not found. Create it on the Users page.',
      );
    }
    return row;
  }

  private async requirePlan(organizationId: string, id: string) {
    const row = await this.prisma.incentivePlan.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Incentive plan not found');
    return row;
  }

  private async requireAssignment(organizationId: string, id: string) {
    const row = await this.prisma.incentiveAssignment.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Assignment not found');
    return row;
  }

  private rethrowUnique(e: unknown, message: string): never {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code?: string }).code === 'P2002'
    ) {
      throw new ConflictException(message);
    }
    throw e;
  }
}

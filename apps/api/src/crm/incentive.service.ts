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
  Prisma,
} from '@prisma/client';
import { Prisma as PrismaRuntime } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { evaluateMiss, matchIncentiveSlab } from './incentive-calc';
import { LAAM_INCENTIVE_SEED } from './incentive-seed';

type PlanWithSlabs = PlanRow & {
  slabs: SlabRow[];
  team?: TeamRow | null;
  _count?: { assignments: number };
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

  async overview(organizationId: string): Promise<IncentiveOverview> {
    const [teams, plans, assignments, settings] = await Promise.all([
      this.prisma.incentiveTeam.findMany({
        where: { organizationId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { plans: true } } },
      }),
      this.prisma.incentivePlan.findMany({
        where: { organizationId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          slabs: { orderBy: { sortOrder: 'asc' } },
          team: true,
          _count: { select: { assignments: true } },
        },
      }),
      this.prisma.incentiveAssignment.findMany({
        where: { organizationId },
        orderBy: [{ agentName: 'asc' }],
        include: { plan: { include: { team: true } } },
      }),
      this.prisma.incentiveOrgSettings.findUnique({
        where: { organizationId },
      }),
    ]);

    return {
      teams: teams.map((t) => this.toTeam(t, t._count.plans)),
      plans: plans.map((p) => this.toPlan(p)),
      assignments: assignments.map((a) =>
        this.toAssignment(a, a.plan.name, a.plan.team?.name),
      ),
      salaryTemplate: this.parseSalary(settings?.salaryTemplate),
      shiftTemplates: this.parseShifts(settings?.shiftTemplates),
      teamCount: teams.length,
      planCount: plans.length,
      assignmentCount: assignments.length,
    };
  }

  async listTeams(organizationId: string): Promise<IncentiveTeam[]> {
    const rows = await this.prisma.incentiveTeam.findMany({
      where: { organizationId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { plans: true } } },
    });
    return rows.map((t) => this.toTeam(t, t._count.plans));
  }

  async createTeam(
    organizationId: string,
    payload: CreateIncentiveTeamPayload,
  ): Promise<IncentiveTeam> {
    const name = payload.name.trim();
    const slug = this.slugify(payload.slug?.trim() || name);
    try {
      const row = await this.prisma.incentiveTeam.create({
        data: {
          organizationId,
          name,
          slug,
          description: payload.description?.trim() || null,
          sortOrder: payload.sortOrder ?? 0,
          isActive: payload.isActive ?? true,
        },
        include: { _count: { select: { plans: true } } },
      });
      return this.toTeam(row, row._count.plans);
    } catch (e) {
      this.rethrowUnique(e, 'Team slug already exists');
    }
  }

  async updateTeam(
    organizationId: string,
    id: string,
    payload: UpdateIncentiveTeamPayload,
  ): Promise<IncentiveTeam> {
    await this.requireTeam(organizationId, id);
    try {
      const row = await this.prisma.incentiveTeam.update({
        where: { id },
        data: {
          ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
          ...(payload.slug !== undefined
            ? { slug: this.slugify(payload.slug.trim()) }
            : {}),
          ...(payload.description !== undefined
            ? { description: payload.description?.trim() || null }
            : {}),
          ...(payload.sortOrder !== undefined
            ? { sortOrder: payload.sortOrder }
            : {}),
          ...(payload.isActive !== undefined
            ? { isActive: payload.isActive }
            : {}),
        },
        include: { _count: { select: { plans: true } } },
      });
      return this.toTeam(row, row._count.plans);
    } catch (e) {
      this.rethrowUnique(e, 'Team slug already exists');
    }
  }

  async deleteTeam(organizationId: string, id: string): Promise<void> {
    await this.requireTeam(organizationId, id);
    await this.prisma.incentiveTeam.delete({ where: { id } });
  }

  async listPlans(organizationId: string): Promise<IncentivePlan[]> {
    const rows = await this.prisma.incentivePlan.findMany({
      where: { organizationId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        slabs: { orderBy: { sortOrder: 'asc' } },
        team: true,
        _count: { select: { assignments: true } },
      },
    });
    return rows.map((p) => this.toPlan(p));
  }

  async createPlan(
    organizationId: string,
    payload: CreateIncentivePlanPayload,
  ): Promise<IncentivePlan> {
    const name = payload.name.trim();
    const slug = this.slugify(payload.slug?.trim() || name);
    if (payload.teamId) await this.requireTeam(organizationId, payload.teamId);
    try {
      const row = await this.prisma.incentivePlan.create({
        data: {
          organizationId,
          teamId: payload.teamId || null,
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
        include: {
          slabs: { orderBy: { sortOrder: 'asc' } },
          team: true,
          _count: { select: { assignments: true } },
        },
      });
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
    if (payload.teamId) await this.requireTeam(organizationId, payload.teamId);
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
              ? { teamId: payload.teamId || null }
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
        include: {
          slabs: { orderBy: { sortOrder: 'asc' } },
          team: true,
          _count: { select: { assignments: true } },
        },
      });
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
  ): Promise<IncentiveAssignment[]> {
    const rows = await this.prisma.incentiveAssignment.findMany({
      where: { organizationId },
      orderBy: [{ agentName: 'asc' }],
      include: { plan: { include: { team: true } } },
    });
    return rows.map((a) =>
      this.toAssignment(a, a.plan.name, a.plan.team?.name),
    );
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
      include: { plan: { include: { team: true } } },
    });
    return this.toAssignment(row, plan.name, row.plan.team?.name);
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
      include: { plan: { include: { team: true } } },
    });
    return this.toAssignment(row, row.plan.name, row.plan.team?.name);
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
    return {
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
    };
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

  /** Seed Laam-style PDF template when org has no teams yet. */
  async seedDefaults(organizationId: string): Promise<IncentiveOverview> {
    const existing = await this.prisma.incentiveTeam.count({
      where: { organizationId },
    });
    if (existing > 0) {
      throw new ConflictException(
        'Incentive teams already exist. Clear them first or edit plans manually.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.incentiveOrgSettings.upsert({
        where: { organizationId },
        create: {
          organizationId,
          salaryTemplate:
            LAAM_INCENTIVE_SEED.salary as unknown as Prisma.InputJsonValue,
          shiftTemplates:
            LAAM_INCENTIVE_SEED.shifts as unknown as Prisma.InputJsonValue,
        },
        update: {
          salaryTemplate:
            LAAM_INCENTIVE_SEED.salary as unknown as Prisma.InputJsonValue,
          shiftTemplates:
            LAAM_INCENTIVE_SEED.shifts as unknown as Prisma.InputJsonValue,
        },
      });

      for (const [i, team] of LAAM_INCENTIVE_SEED.teams.entries()) {
        const teamRow = await tx.incentiveTeam.create({
          data: {
            organizationId,
            name: team.name,
            slug: team.slug,
            description: team.description,
            sortOrder: i,
            isActive: true,
          },
        });
        if (!team.plan) continue;
        await tx.incentivePlan.create({
          data: {
            organizationId,
            teamId: teamRow.id,
            name: team.plan.name,
            slug: team.plan.slug,
            description: team.plan.description,
            metricType: team.plan.metricType,
            metricConfig: team.plan.metricConfig as
              | Prisma.InputJsonValue
              | undefined,
            teamMonthlyTarget: team.plan.teamMonthlyTarget ?? null,
            prorataAboveTop: team.plan.prorataAboveTop ?? false,
            sortOrder: i,
            isActive: true,
            slabs: {
              create: team.plan.slabs.map((s, si) => ({
                label: s.label ?? null,
                dailyTarget:
                  'dailyTarget' in s ? (s.dailyTarget ?? null) : null,
                monthlyTarget: s.monthlyTarget,
                incentiveBdt: s.incentiveBdt,
                sortOrder: si,
              })),
            },
          },
        });
      }
    });

    return this.overview(organizationId);
  }

  /** Add only missing Laam seed teams/plans; preserve all tenant customizations. */
  async syncMissingSeed(organizationId: string): Promise<IncentiveOverview> {
    await this.prisma.$transaction(async (tx) => {
      const settings = await tx.incentiveOrgSettings.findUnique({
        where: { organizationId },
      });
      if (!settings) {
        await tx.incentiveOrgSettings.create({
          data: {
            organizationId,
            salaryTemplate:
              LAAM_INCENTIVE_SEED.salary as unknown as Prisma.InputJsonValue,
            shiftTemplates:
              LAAM_INCENTIVE_SEED.shifts as unknown as Prisma.InputJsonValue,
          },
        });
      }

      for (const [i, team] of LAAM_INCENTIVE_SEED.teams.entries()) {
        let teamRow = await tx.incentiveTeam.findUnique({
          where: { organizationId_slug: { organizationId, slug: team.slug } },
        });
        if (!teamRow) {
          teamRow = await tx.incentiveTeam.create({
            data: {
              organizationId,
              name: team.name,
              slug: team.slug,
              description: team.description,
              sortOrder: i,
              isActive: true,
            },
          });
        }
        if (!team.plan) continue;
        const existingPlan = await tx.incentivePlan.findUnique({
          where: {
            organizationId_slug: { organizationId, slug: team.plan.slug },
          },
        });
        if (existingPlan) continue;
        await tx.incentivePlan.create({
          data: {
            organizationId,
            teamId: teamRow.id,
            name: team.plan.name,
            slug: team.plan.slug,
            description: team.plan.description,
            metricType: team.plan.metricType,
            metricConfig: team.plan.metricConfig as
              | Prisma.InputJsonValue
              | undefined,
            teamMonthlyTarget: team.plan.teamMonthlyTarget ?? null,
            prorataAboveTop: team.plan.prorataAboveTop ?? false,
            sortOrder: i,
            isActive: true,
            slabs: {
              create: team.plan.slabs.map((slab, slabIndex) => ({
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
    });
    return this.overview(organizationId);
  }

  async performance(
    organizationId: string,
    yearMonth: string,
  ): Promise<IncentivePerformanceReport> {
    const ym = this.validateYearMonth(yearMonth);
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
            slabs: { orderBy: { sortOrder: 'asc' } },
            team: true,
          },
        },
      },
    });

    const agentNames = [...new Set(assignments.map((a) => a.agentName))];
    const assignmentIds = assignments.map((a) => a.id);
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
      agentNames.length === 0
        ? Promise.resolve([])
        : this.prisma.order.findMany({
            where: {
              organizationId,
              deletedAt: null,
              assignedAgentName: { in: agentNames },
              orderDate: { gte: historyStart, lte: periodEnd },
            },
            select: {
              assignedAgentName: true,
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

    const ordersByAgentMonth = new Map<string, typeof orders>();
    for (const o of orders) {
      const key = o.assignedAgentName ?? '';
      if (!key) continue;
      const orderMonth = this.toYearMonth(o.orderDate);
      const mapKey = `${key}\u0000${orderMonth}`;
      const list = ordersByAgentMonth.get(mapKey) ?? [];
      list.push(o);
      ordersByAgentMonth.set(mapKey, list);
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
        return this.calcLine(
          a,
          ordersByAgentMonth.get(`${a.agentName}\u0000${month}`) ?? [],
          manualByAssignmentMonth.get(`${a.id}\u0000${month}`)?.actualValue,
          surveyByAgentMonth.get(`${a.agentName}\u0000${month}`) ?? 0,
          channelsByAgentMonth.get(`${a.agentName}\u0000${month}`) ?? [],
          workingDays,
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
        teamMonthlyTarget: plan?.teamMonthlyTarget ?? null,
        actualTotal: 0,
      };
      current.actualTotal += line.actualValue;
      if (current.teamMonthlyTarget != null) {
        current.met = current.actualTotal >= current.teamMonthlyTarget;
      }
      rollups.set(line.planId, current);
    }

    return {
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
  }

  async listPeriods(organizationId: string): Promise<IncentivePeriodRun[]> {
    const rows = await this.prisma.incentivePeriodRun.findMany({
      where: { organizationId },
      orderBy: { yearMonth: 'desc' },
      include: {
        lines: { orderBy: [{ teamName: 'asc' }, { agentName: 'asc' }] },
      },
    });
    return rows.map((row) => this.toPeriod(row));
  }

  async getPeriod(
    organizationId: string,
    yearMonth: string,
  ): Promise<IncentivePeriodRun> {
    const ym = this.validateYearMonth(yearMonth);
    const row = await this.prisma.incentivePeriodRun.findUnique({
      where: { organizationId_yearMonth: { organizationId, yearMonth: ym } },
      include: {
        lines: { orderBy: [{ teamName: 'asc' }, { agentName: 'asc' }] },
      },
    });
    if (!row) throw new NotFoundException('Incentive period not found');
    return this.toPeriod(row);
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
    return this.transitionPeriod(
      organizationId,
      yearMonth,
      'approved',
      'paid',
      user,
    );
  }

  // --- calc helpers ---

  private calcLine(
    assignment: AssignmentRow & {
      plan: PlanWithSlabs;
    },
    orders: { status: string; itemsCount: number; orderTag?: string | null }[],
    manualActual?: number,
    surveyCount = 0,
    channelLogs: { channel: string; activityCount: number }[] = [],
    workingDaysInMonth = 0,
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
      const denom = delivered + returned;
      actualValue =
        denom === 0 ? 0 : Math.round((returned / denom) * 10000) / 100;
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
    } else if (metricType !== 'manual') {
      // order_count | recovery_count
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

    const match = matchIncentiveSlab(
      plan.slabs,
      actualValue,
      direction,
      plan.prorataAboveTop,
    );
    const entryTarget =
      direction === 'higher' && plan.slabs.length
        ? Math.min(...plan.slabs.map((slab) => slab.monthlyTarget))
        : null;
    const manualMissing = metricType === 'manual' && manualActual === undefined;
    const missed = evaluateMiss(direction, actualValue, plan.slabs);
    const dailyAverage =
      workingDaysInMonth > 0
        ? Math.round((actualValue / workingDaysInMonth) * 100) / 100
        : null;
    const belowDailyEntry =
      config.entryDailyTarget != null &&
      dailyAverage != null &&
      dailyAverage < config.entryDailyTarget;
    const warning = manualMissing
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
      planId: plan.id,
      planName: plan.name,
      teamName: plan.team?.name,
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

  private toTeam(
    row: TeamRow & { _count?: { plans: number } },
    planCount?: number,
  ): IncentiveTeam {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? undefined,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      planCount: planCount ?? row._count?.plans,
    };
  }

  private toPlan(row: PlanWithSlabs): IncentivePlan {
    return {
      id: row.id,
      teamId: row.teamId,
      teamName: row.team?.name,
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

  private async requireTeam(organizationId: string, id: string) {
    const row = await this.prisma.incentiveTeam.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Incentive team not found');
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

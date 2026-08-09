import type {
  CreateIncentiveAssignmentPayload,
  CreateIncentivePlanPayload,
  CreateIncentiveSpecialBonusPayload,
  CreateIncentiveTeamPayload,
  IncentiveAssignment,
  IncentiveAttendance,
  IncentiveChannelLog,
  IncentiveOverview,
  IncentiveOpsMonth,
  IncentivePerformanceReport,
  IncentivePeriodRun,
  IncentivePlan,
  IncentiveSalaryTemplate,
  IncentiveShiftTemplate,
  IncentiveSpecialBonus,
  IncentiveSurveyLog,
  IncentiveTeam,
  UpdateIncentiveAssignmentPayload,
  UpdateIncentivePlanPayload,
  UpdateIncentiveTeamPayload,
  UpsertIncentiveSalaryPayload,
  UpsertIncentiveShiftsPayload,
  UpsertIncentiveManualActualPayload,
  UpsertIncentiveAttendancePayload,
  UpsertIncentiveChannelPayload,
  UpsertIncentiveSurveyPayload,
} from '@laam/types';

import { apiRequest } from '@/lib/api/client';
import {
  deleteMockSpecialBonus,
  getEmptyIncentiveOverview,
  getMockManualActual,
  mutateMockIncentive,
  mutateMockIncentiveOps,
  mutateMockIncentivePeriods,
  replaceMockIncentivePeriods,
  setMockManualActual,
  upsertMockOpsRow,
} from '../data/mock-incentive';

export type IncentiveApi = {
  getOverview: () => Promise<IncentiveOverview>;
  getPerformance: (yearMonth?: string) => Promise<IncentivePerformanceReport>;
  seedDefaults: () => Promise<IncentiveOverview>;
  createTeam: (payload: CreateIncentiveTeamPayload) => Promise<IncentiveTeam>;
  updateTeam: (id: string, payload: UpdateIncentiveTeamPayload) => Promise<IncentiveTeam>;
  deleteTeam: (id: string) => Promise<void>;
  createPlan: (payload: CreateIncentivePlanPayload) => Promise<IncentivePlan>;
  updatePlan: (id: string, payload: UpdateIncentivePlanPayload) => Promise<IncentivePlan>;
  deletePlan: (id: string) => Promise<void>;
  createAssignment: (
    payload: CreateIncentiveAssignmentPayload,
  ) => Promise<IncentiveAssignment>;
  updateAssignment: (
    id: string,
    payload: UpdateIncentiveAssignmentPayload,
  ) => Promise<IncentiveAssignment>;
  deleteAssignment: (id: string) => Promise<void>;
  upsertSalary: (payload: UpsertIncentiveSalaryPayload) => Promise<IncentiveSalaryTemplate>;
  upsertShifts: (payload: UpsertIncentiveShiftsPayload) => Promise<IncentiveShiftTemplate[]>;
  upsertManualActual: (
    payload: UpsertIncentiveManualActualPayload,
  ) => Promise<unknown>;
  getOps: (yearMonth: string) => Promise<IncentiveOpsMonth>;
  upsertAttendance: (
    payload: UpsertIncentiveAttendancePayload,
  ) => Promise<IncentiveAttendance>;
  upsertSurvey: (payload: UpsertIncentiveSurveyPayload) => Promise<IncentiveSurveyLog>;
  upsertChannel: (payload: UpsertIncentiveChannelPayload) => Promise<IncentiveChannelLog>;
  createSpecialBonus: (
    payload: CreateIncentiveSpecialBonusPayload,
  ) => Promise<IncentiveSpecialBonus>;
  deleteSpecialBonus: (id: string) => Promise<void>;
  seedSyncMissing: () => Promise<IncentiveOverview>;
  listPeriods: () => Promise<IncentivePeriodRun[]>;
  getPeriod: (yearMonth: string) => Promise<IncentivePeriodRun | null>;
  generatePeriod: (yearMonth: string) => Promise<IncentivePeriodRun>;
  approvePeriod: (yearMonth: string) => Promise<IncentivePeriodRun>;
  markPeriodPaid: (yearMonth: string) => Promise<IncentivePeriodRun>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockIncentiveApi(): IncentiveApi {
  return {
    async getOverview() {
      await delay(80);
      return mutateMockIncentive((s) => s);
    },
    async getPerformance(yearMonth) {
      await delay(100);
      const now = new Date();
      const ym =
        yearMonth ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const period = mutateMockIncentivePeriods((rows) =>
        rows.find((row) => row.yearMonth === ym),
      );
      if (period) {
        return {
          yearMonth: ym,
          periodStart: `${ym}-01`,
          periodEnd: `${ym}-28`,
          lines: period.lines.map((line) => ({
            assignmentId: line.assignmentId ?? line.id,
            agentName: line.agentName,
            planId: line.planId,
            planName: line.planName,
            teamName: line.teamName,
            metricType: line.metricType,
            actualValue: line.actualValue,
            matchedSlabLabel: line.matchedSlabLabel,
            incentiveBdt: line.incentiveBdt,
            specialBonusBdt: line.specialBonusBdt,
            attendanceBonusBdt: line.attendanceBonusBdt,
            totalPayBdt: line.totalPayBdt,
            hrStatus: line.hrStatus,
            warning: line.warning,
            notes: line.notes,
          })),
          totalIncentiveBdt: period.totalIncentiveBdt,
          totalSpecialBonusBdt: period.totalSpecialBonusBdt,
          totalAttendanceBonusBdt: period.totalAttendanceBonusBdt,
          totalPayBdt: period.totalPayBdt,
          warningCount: period.lines.filter((line) => line.warning && line.warning !== 'none')
            .length,
          periodStatus: period.status,
        };
      }
      return mutateMockIncentive((state) => {
        const lines = state.assignments
          .filter((assignment) => assignment.isActive)
          .map((assignment) => {
            const plan = state.plans.find((item) => item.id === assignment.planId)!;
            const manual = getMockManualActual(assignment.id, ym);
            const ops = mutateMockIncentiveOps(ym, (rows) => rows);
            const matchesAssignment = (row: {
              assignmentId?: string | null;
              agentName: string;
            }) =>
              row.assignmentId === assignment.id ||
              (!row.assignmentId && row.agentName === assignment.agentName);
            const actualValue =
              plan.metricType === 'survey_count'
                ? ops.surveys
                    .filter(matchesAssignment)
                    .reduce((sum, row) => sum + row.surveyCount, 0)
                : plan.metricType === 'channel_activity'
                  ? ops.channels
                      .filter(
                        (row) =>
                          matchesAssignment(row) &&
                          (!plan.metricConfig?.channels?.length ||
                            plan.metricConfig.channels.includes(row.channel)),
                      )
                      .reduce((sum, row) => sum + row.activityCount, 0)
                  : (manual?.actualValue ?? 0);
            const slabs = [...plan.slabs].sort((a, b) => a.monthlyTarget - b.monthlyTarget);
            const matched =
              plan.metricConfig?.direction === 'lower'
                ? [...slabs].reverse().find((slab) => actualValue <= slab.monthlyTarget)
                : [...slabs].reverse().find((slab) => actualValue >= slab.monthlyTarget);
            const attendance = ops.attendance.find(
              (row) =>
                (assignment.userId && row.userId === assignment.userId) ||
                row.agentName === assignment.agentName,
            );
            const attendanceBonusBdt = attendance?.attendanceBonusEligible
              ? (state.salaryTemplate?.attendanceBonusBdt ?? 0)
              : 0;
            const specialBonusBdt = ops.specialBonuses
              .filter(
                (row) =>
                  row.assignmentId === assignment.id ||
                  (!row.assignmentId && row.agentName === assignment.agentName),
              )
              .reduce((sum, row) => sum + row.amountBdt, 0);
            const incentiveBdt = matched?.incentiveBdt ?? 0;
            return {
              assignmentId: assignment.id,
              agentName: assignment.agentName,
              planId: plan.id,
              planName: plan.name,
              teamName: plan.teamName,
              metricType: plan.metricType,
              actualValue,
              matchedSlabId: matched?.id ?? null,
              matchedSlabLabel: matched?.label ?? null,
              monthlyTarget: matched?.monthlyTarget ?? null,
              entryTarget: slabs[0]?.monthlyTarget ?? null,
              incentiveBdt,
              attendanceBonusBdt,
              specialBonusBdt,
              totalPayBdt: incentiveBdt + attendanceBonusBdt + specialBonusBdt,
              attendanceBonusEligible: attendance?.attendanceBonusEligible ?? false,
              hrStatus: assignment.hrStatus ?? 'active',
              manualOverride: Boolean(manual),
              consecutiveMissMonths: 0,
              warning:
                plan.metricType === 'manual' && !manual
                  ? ('manual_missing' as const)
                  : matched
                    ? ('none' as const)
                    : ('below_target' as const),
              notes: manual?.note ?? undefined,
            };
          });
        return {
        yearMonth: ym,
        periodStart: `${ym}-01`,
        periodEnd: `${ym}-28`,
          lines,
          totalIncentiveBdt: lines.reduce((sum, line) => sum + line.incentiveBdt, 0),
          totalSpecialBonusBdt: lines.reduce(
            (sum, line) => sum + line.specialBonusBdt,
            0,
          ),
          totalAttendanceBonusBdt: lines.reduce(
            (sum, line) => sum + line.attendanceBonusBdt,
            0,
          ),
          totalPayBdt: lines.reduce((sum, line) => sum + line.totalPayBdt, 0),
          warningCount: lines.filter((line) => line.warning !== 'none').length,
          teamRollups: state.plans
            .filter((plan) => plan.teamMonthlyTarget != null)
            .map((plan) => {
              const actualTotal = lines
                .filter((line) => line.planId === plan.id)
                .reduce((sum, line) => sum + line.actualValue, 0);
              return {
                planId: plan.id,
                planName: plan.name,
                teamName: plan.teamName,
                teamMonthlyTarget: plan.teamMonthlyTarget,
                actualTotal,
                met: actualTotal >= (plan.teamMonthlyTarget ?? 0),
              };
            }),
          periodStatus: 'live' as const,
        };
      });
    },
    async seedDefaults() {
      await delay(150);
      return mutateMockIncentive((s) => {
        if (s.teams.length) throw new Error('Incentive teams already exist');
        const seeded = getEmptyIncentiveOverview(true);
        Object.assign(s, seeded);
        return s;
      });
    },
    async createTeam(payload) {
      await delay(100);
      return mutateMockIncentive((s) => {
        const team: IncentiveTeam = {
          id: `team-${Date.now()}`,
          name: payload.name.trim(),
          slug: (payload.slug || payload.name).toLowerCase().replace(/\s+/g, '-'),
          description: payload.description ?? undefined,
          sortOrder: payload.sortOrder ?? s.teams.length,
          isActive: payload.isActive ?? true,
          planCount: 0,
        };
        s.teams = [...s.teams, team];
        s.teamCount = s.teams.length;
        return team;
      });
    },
    async updateTeam(id, payload) {
      await delay(80);
      return mutateMockIncentive((s) => {
        const idx = s.teams.findIndex((t) => t.id === id);
        if (idx < 0) throw new Error('Team not found');
        const next: IncentiveTeam = {
          ...s.teams[idx]!,
          name: payload.name?.trim() ?? s.teams[idx]!.name,
          slug: payload.slug ?? s.teams[idx]!.slug,
          description:
            payload.description === null
              ? undefined
              : (payload.description ?? s.teams[idx]!.description),
          sortOrder: payload.sortOrder ?? s.teams[idx]!.sortOrder,
          isActive: payload.isActive ?? s.teams[idx]!.isActive,
        };
        s.teams = s.teams.map((t, i) => (i === idx ? next : t));
        return next;
      });
    },
    async deleteTeam(id) {
      await delay(80);
      mutateMockIncentive((s) => {
        s.teams = s.teams.filter((t) => t.id !== id);
        s.teamCount = s.teams.length;
        return s;
      });
    },
    async createPlan(payload) {
      await delay(120);
      return mutateMockIncentive((s) => {
        const plan: IncentivePlan = {
          id: `plan-${Date.now()}`,
          teamId: payload.teamId ?? null,
          teamName: s.teams.find((t) => t.id === payload.teamId)?.name,
          name: payload.name.trim(),
          slug: (payload.slug || payload.name).toLowerCase().replace(/\s+/g, '-'),
          description: payload.description ?? undefined,
          metricType: payload.metricType,
          metricConfig: payload.metricConfig ?? undefined,
          teamMonthlyTarget: payload.teamMonthlyTarget ?? null,
          periodType: 'monthly',
          isActive: payload.isActive ?? true,
          prorataAboveTop: payload.prorataAboveTop ?? false,
          sortOrder: payload.sortOrder ?? s.plans.length,
          slabs: (payload.slabs ?? []).map((sl, i) => ({
            id: `slab-${Date.now()}-${i}`,
            label: sl.label ?? undefined,
            dailyTarget: sl.dailyTarget ?? null,
            monthlyTarget: sl.monthlyTarget,
            incentiveBdt: sl.incentiveBdt,
            sortOrder: sl.sortOrder ?? i,
          })),
          assignmentCount: 0,
        };
        s.plans = [...s.plans, plan];
        s.planCount = s.plans.length;
        return plan;
      });
    },
    async updatePlan(id, payload) {
      await delay(100);
      return mutateMockIncentive((s) => {
        const idx = s.plans.findIndex((p) => p.id === id);
        if (idx < 0) throw new Error('Plan not found');
        const cur = s.plans[idx]!;
        const next: IncentivePlan = {
          ...cur,
          name: payload.name?.trim() ?? cur.name,
          slug: payload.slug ?? cur.slug,
          description:
            payload.description === null ? undefined : (payload.description ?? cur.description),
          metricType: payload.metricType ?? cur.metricType,
          metricConfig:
            payload.metricConfig === null
              ? undefined
              : (payload.metricConfig ?? cur.metricConfig),
          teamMonthlyTarget:
            payload.teamMonthlyTarget === undefined
              ? cur.teamMonthlyTarget
              : payload.teamMonthlyTarget,
          isActive: payload.isActive ?? cur.isActive,
          prorataAboveTop: payload.prorataAboveTop ?? cur.prorataAboveTop,
          sortOrder: payload.sortOrder ?? cur.sortOrder,
          teamId: payload.teamId === undefined ? cur.teamId : payload.teamId,
          teamName:
            payload.teamId === undefined
              ? cur.teamName
              : s.teams.find((t) => t.id === payload.teamId)?.name,
          slabs: payload.slabs
            ? payload.slabs.map((sl, i) => ({
                id: `slab-${Date.now()}-${i}`,
                label: sl.label ?? undefined,
                dailyTarget: sl.dailyTarget ?? null,
                monthlyTarget: sl.monthlyTarget,
                incentiveBdt: sl.incentiveBdt,
                sortOrder: sl.sortOrder ?? i,
              }))
            : cur.slabs,
          periodType: 'monthly',
        };
        s.plans = s.plans.map((p, i) => (i === idx ? next : p));
        return next;
      });
    },
    async deletePlan(id) {
      await delay(80);
      mutateMockIncentive((s) => {
        s.plans = s.plans.filter((p) => p.id !== id);
        s.assignments = s.assignments.filter((a) => a.planId !== id);
        s.planCount = s.plans.length;
        s.assignmentCount = s.assignments.length;
        return s;
      });
    },
    async createAssignment(payload) {
      await delay(100);
      return mutateMockIncentive((s) => {
        const plan = s.plans.find((p) => p.id === payload.planId);
        if (!plan) throw new Error('Plan not found');
        const row: IncentiveAssignment = {
          id: `asg-${Date.now()}`,
          planId: payload.planId,
          planName: plan.name,
          teamName: plan.teamName,
          agentName: payload.agentName.trim(),
          userId: payload.userId ?? null,
          shift: payload.shift ?? null,
          startsOn: payload.startsOn ?? new Date().toISOString().slice(0, 10),
          endsOn: payload.endsOn ?? null,
          isActive: payload.isActive ?? true,
          hrStatus: payload.hrStatus ?? 'active',
        };
        s.assignments = [...s.assignments, row];
        s.assignmentCount = s.assignments.length;
        return row;
      });
    },
    async updateAssignment(id, payload) {
      await delay(80);
      return mutateMockIncentive((s) => {
        const idx = s.assignments.findIndex((a) => a.id === id);
        if (idx < 0) throw new Error('Assignment not found');
        const cur = s.assignments[idx]!;
        const plan = payload.planId
          ? s.plans.find((p) => p.id === payload.planId)
          : s.plans.find((p) => p.id === cur.planId);
        const next: IncentiveAssignment = {
          ...cur,
          ...payload,
          agentName: payload.agentName?.trim() ?? cur.agentName,
          planName: plan?.name ?? cur.planName,
          teamName: plan?.teamName ?? cur.teamName,
        };
        s.assignments = s.assignments.map((a, i) => (i === idx ? next : a));
        return next;
      });
    },
    async deleteAssignment(id) {
      await delay(80);
      mutateMockIncentive((s) => {
        s.assignments = s.assignments.filter((a) => a.id !== id);
        s.assignmentCount = s.assignments.length;
        return s;
      });
    },
    async upsertSalary(payload) {
      await delay(80);
      return mutateMockIncentive((s) => {
        s.salaryTemplate = payload;
        return payload;
      });
    },
    async upsertShifts(payload) {
      await delay(80);
      return mutateMockIncentive((state) => {
        state.shiftTemplates = payload.shifts;
        return payload.shifts;
      });
    },
    async upsertManualActual(payload) {
      await delay(80);
      setMockManualActual(payload.assignmentId, payload.yearMonth, {
        actualValue: payload.actualValue,
        note: payload.note,
      });
      return this.getPerformance(payload.yearMonth);
    },
    async getOps(yearMonth) {
      await delay(60);
      return mutateMockIncentiveOps(yearMonth, (ops) => ({
        ...ops,
        attendance: [...ops.attendance],
        surveys: [...ops.surveys],
        channels: [...ops.channels],
        specialBonuses: [...ops.specialBonuses],
      }));
    },
    async upsertAttendance(payload) {
      await delay(60);
      return mutateMockIncentiveOps(payload.yearMonth, (ops) => {
        const existing = ops.attendance.find(
          (row) =>
            (payload.userId && row.userId === payload.userId) ||
            (!payload.userId && row.agentName === payload.agentName),
        );
        const lateCount = payload.lateCount ?? 0;
        const earlyLeaveCount = payload.earlyLeaveCount ?? 0;
        const unapprovedAbsence = payload.unapprovedAbsence ?? 0;
        const fullAttendance =
          payload.presentDays >= payload.workingDays &&
          lateCount === 0 &&
          earlyLeaveCount === 0 &&
          unapprovedAbsence === 0;
        const row: IncentiveAttendance = {
          id: existing?.id ?? `attendance-${Date.now()}`,
          ...payload,
          lateCount,
          earlyLeaveCount,
          unapprovedAbsence,
          fullAttendance,
          attendanceBonusEligible: fullAttendance,
        };
        ops.attendance = upsertMockOpsRow(
          ops.attendance,
          row,
          (item) => item.id === row.id,
        );
        return row;
      });
    },
    async upsertSurvey(payload) {
      await delay(60);
      return mutateMockIncentiveOps(payload.yearMonth, (ops) => {
        const existing = ops.surveys.find(
          (row) =>
            (payload.assignmentId && row.assignmentId === payload.assignmentId) ||
            (!payload.assignmentId && row.agentName === payload.agentName),
        );
        const row: IncentiveSurveyLog = {
          id: existing?.id ?? `survey-${Date.now()}`,
          ...payload,
          recordedAt: new Date().toISOString(),
        };
        ops.surveys = upsertMockOpsRow(ops.surveys, row, (item) => item.id === row.id);
        return row;
      });
    },
    async upsertChannel(payload) {
      await delay(60);
      return mutateMockIncentiveOps(payload.yearMonth, (ops) => {
        const existing = ops.channels.find(
          (row) =>
            row.channel === payload.channel &&
            ((payload.assignmentId && row.assignmentId === payload.assignmentId) ||
              (!payload.assignmentId && row.agentName === payload.agentName)),
        );
        const row: IncentiveChannelLog = {
          id: existing?.id ?? `channel-${Date.now()}`,
          ...payload,
        };
        ops.channels = upsertMockOpsRow(ops.channels, row, (item) => item.id === row.id);
        return row;
      });
    },
    async createSpecialBonus(payload) {
      await delay(60);
      return mutateMockIncentiveOps(payload.yearMonth, (ops) => {
        const row: IncentiveSpecialBonus = {
          id: `bonus-${Date.now()}`,
          ...payload,
          createdByName: 'Current user',
          createdAt: new Date().toISOString(),
        };
        ops.specialBonuses = [...ops.specialBonuses, row];
        return row;
      });
    },
    async deleteSpecialBonus(id) {
      await delay(60);
      deleteMockSpecialBonus(id);
    },
    async seedSyncMissing() {
      await delay(100);
      return mutateMockIncentive((state) => state);
    },
    async listPeriods() {
      await delay(80);
      return mutateMockIncentivePeriods((rows) => [...rows]);
    },
    async getPeriod(yearMonth) {
      await delay(60);
      return (
        mutateMockIncentivePeriods((rows) =>
          rows.find((row) => row.yearMonth === yearMonth),
        ) ?? null
      );
    },
    async generatePeriod(yearMonth) {
      const report = await this.getPerformance(yearMonth);
      const run: IncentivePeriodRun = {
        id: `period-${yearMonth}`,
        yearMonth,
        status: 'draft',
        totalIncentiveBdt: report.totalIncentiveBdt,
        totalSpecialBonusBdt: report.totalSpecialBonusBdt,
        totalAttendanceBonusBdt: report.totalAttendanceBonusBdt,
        totalPayBdt: report.totalPayBdt,
        calculatedAt: new Date().toISOString(),
        lines: report.lines.map((line, index) => ({
          id: `period-line-${yearMonth}-${index}`,
          assignmentId: line.assignmentId,
          agentName: line.agentName,
          planId: line.planId,
          planName: line.planName,
          teamName: line.teamName,
          metricType: line.metricType,
          actualValue: line.actualValue,
          incentiveBdt: line.incentiveBdt,
          specialBonusBdt: line.specialBonusBdt,
          attendanceBonusBdt: line.attendanceBonusBdt,
          totalPayBdt: line.totalPayBdt,
          matchedSlabLabel: line.matchedSlabLabel,
          warning: line.warning,
          hrStatus: line.hrStatus,
          notes: line.notes,
        })),
      };
      replaceMockIncentivePeriods([
        ...mutateMockIncentivePeriods((rows) =>
          rows.filter((row) => row.yearMonth !== yearMonth),
        ),
        run,
      ]);
      return run;
    },
    async approvePeriod(yearMonth) {
      const current = await this.getPeriod(yearMonth);
      if (!current) throw new Error('Generate the payout period first');
      const updated = {
        ...current,
        status: 'approved' as const,
        approvedAt: new Date().toISOString(),
        approvedByName: 'Current user',
      };
      replaceMockIncentivePeriods(
        mutateMockIncentivePeriods((rows) =>
          rows.map((row) => (row.yearMonth === yearMonth ? updated : row)),
        ),
      );
      return updated;
    },
    async markPeriodPaid(yearMonth) {
      const current = await this.getPeriod(yearMonth);
      if (!current || current.status !== 'approved') {
        throw new Error('Approve the payout period before marking it paid');
      }
      const updated = {
        ...current,
        status: 'paid' as const,
        paidAt: new Date().toISOString(),
        paidByName: 'Current user',
      };
      replaceMockIncentivePeriods(
        mutateMockIncentivePeriods((rows) =>
          rows.map((row) => (row.yearMonth === yearMonth ? updated : row)),
        ),
      );
      return updated;
    },
  };
}

export function createHttpIncentiveApi(): IncentiveApi {
  return {
    getOverview: () => apiRequest<IncentiveOverview>('/crm/incentive/overview'),
    getPerformance: (yearMonth) => {
      const q = yearMonth ? `?yearMonth=${encodeURIComponent(yearMonth)}` : '';
      return apiRequest<IncentivePerformanceReport>(`/crm/incentive/performance${q}`);
    },
    seedDefaults: () =>
      apiRequest<IncentiveOverview>('/crm/incentive/seed-defaults', { method: 'POST' }),
    createTeam: (payload) =>
      apiRequest<IncentiveTeam>('/crm/incentive/teams', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateTeam: (id, payload) =>
      apiRequest<IncentiveTeam>(`/crm/incentive/teams/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    deleteTeam: async (id) => {
      await apiRequest(`/crm/incentive/teams/${id}`, { method: 'DELETE' });
    },
    createPlan: (payload) =>
      apiRequest<IncentivePlan>('/crm/incentive/plans', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updatePlan: (id, payload) =>
      apiRequest<IncentivePlan>(`/crm/incentive/plans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    deletePlan: async (id) => {
      await apiRequest(`/crm/incentive/plans/${id}`, { method: 'DELETE' });
    },
    createAssignment: (payload) =>
      apiRequest<IncentiveAssignment>('/crm/incentive/assignments', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateAssignment: (id, payload) =>
      apiRequest<IncentiveAssignment>(`/crm/incentive/assignments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    deleteAssignment: async (id) => {
      await apiRequest(`/crm/incentive/assignments/${id}`, { method: 'DELETE' });
    },
    upsertSalary: (payload) =>
      apiRequest<IncentiveSalaryTemplate>('/crm/incentive/salary', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    upsertShifts: (payload) =>
      apiRequest<IncentiveShiftTemplate[]>('/crm/incentive/shifts', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    upsertManualActual: (payload) =>
      apiRequest<unknown>('/crm/incentive/manual-actuals', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    getOps: (yearMonth) =>
      apiRequest<IncentiveOpsMonth>(
        `/crm/incentive/ops?yearMonth=${encodeURIComponent(yearMonth)}`,
      ),
    upsertAttendance: (payload) =>
      apiRequest<IncentiveAttendance>('/crm/incentive/attendance', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    upsertSurvey: (payload) =>
      apiRequest<IncentiveSurveyLog>('/crm/incentive/surveys', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    upsertChannel: (payload) =>
      apiRequest<IncentiveChannelLog>('/crm/incentive/channels', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    createSpecialBonus: (payload) =>
      apiRequest<IncentiveSpecialBonus>('/crm/incentive/special-bonuses', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    deleteSpecialBonus: async (id) => {
      await apiRequest(`/crm/incentive/special-bonuses/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    },
    seedSyncMissing: () =>
      apiRequest<IncentiveOverview>('/crm/incentive/seed-sync-missing', {
        method: 'POST',
      }),
    listPeriods: () => apiRequest<IncentivePeriodRun[]>('/crm/incentive/periods'),
    getPeriod: (yearMonth) =>
      apiRequest<IncentivePeriodRun | null>(
        `/crm/incentive/periods/${encodeURIComponent(yearMonth)}`,
      ),
    generatePeriod: (yearMonth) =>
      apiRequest<IncentivePeriodRun>(
        `/crm/incentive/periods/${encodeURIComponent(yearMonth)}/generate`,
        { method: 'POST' },
      ),
    approvePeriod: (yearMonth) =>
      apiRequest<IncentivePeriodRun>(
        `/crm/incentive/periods/${encodeURIComponent(yearMonth)}/approve`,
        { method: 'PATCH' },
      ),
    markPeriodPaid: (yearMonth) =>
      apiRequest<IncentivePeriodRun>(
        `/crm/incentive/periods/${encodeURIComponent(yearMonth)}/paid`,
        { method: 'PATCH' },
      ),
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const incentiveApi = useHttpApi ? createHttpIncentiveApi() : createMockIncentiveApi();

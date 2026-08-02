import type {
  IncentiveOpsMonth,
  IncentiveOverview,
  IncentivePeriodRun,
  IncentiveShiftTemplate,
} from '@laam/types';

const DEFAULT_SALARY = {
  basicBdt: 5600,
  houseRentBdt: 4200,
  medicalBdt: 2800,
  conveyanceBdt: 1400,
  grossBdt: 14000,
  attendanceBonusBdt: 1000,
  lunchBdt: 1000,
  totalBdt: 16000,
  notes: 'Reference salary template — editable per tenant',
};

export const DEFAULT_INCENTIVE_SHIFTS: IncentiveShiftTemplate[] = [
  {
    id: 'morning',
    name: 'Morning',
    startTime: '08:00',
    endTime: '16:00',
    reportingTime: '07:50',
  },
  {
    id: 'evening',
    name: 'Evening',
    startTime: '16:00',
    endTime: '00:00',
    reportingTime: '15:50',
  },
  {
    id: 'night',
    name: 'Night',
    startTime: '00:00',
    endTime: '08:00',
    reportingTime: '23:50',
  },
];

/** Minimal seeded mock when user clicks Seed defaults (offline mode). */
export function getEmptyIncentiveOverview(seeded = false): IncentiveOverview {
  if (!seeded) {
    return {
      teams: [],
      plans: [],
      assignments: [],
      salaryTemplate: null,
      shiftTemplates: [],
      teamCount: 0,
      planCount: 0,
      assignmentCount: 0,
    };
  }

  return {
    teams: [
      {
        id: 'mock-telesales',
        name: 'Telesales',
        slug: 'telesales',
        description: 'Successful verified orders',
        sortOrder: 0,
        isActive: true,
        planCount: 1,
      },
      {
        id: 'mock-logistic',
        name: 'Logistic',
        slug: 'logistic',
        description: 'Return ratio based',
        sortOrder: 1,
        isActive: true,
        planCount: 1,
      },
    ],
    plans: [
      {
        id: 'mock-plan-ts',
        teamId: 'mock-telesales',
        teamName: 'Telesales',
        name: 'Telesales monthly orders',
        slug: 'telesales-orders',
        metricType: 'order_count',
        metricConfig: { includeStatuses: ['confirmed', 'delivered'] },
        teamMonthlyTarget: 1040,
        periodType: 'monthly',
        isActive: true,
        prorataAboveTop: true,
        sortOrder: 0,
        slabs: [
          {
            id: 's1',
            label: '8/day',
            dailyTarget: 8,
            monthlyTarget: 208,
            incentiveBdt: 1000,
            sortOrder: 0,
          },
          {
            id: 's2',
            label: '20/day',
            dailyTarget: 20,
            monthlyTarget: 520,
            incentiveBdt: 7000,
            sortOrder: 1,
          },
        ],
        assignmentCount: 0,
      },
      {
        id: 'mock-plan-log',
        teamId: 'mock-logistic',
        teamName: 'Logistic',
        name: 'Logistic return ratio',
        slug: 'logistic-return-ratio',
        metricType: 'return_ratio',
        metricConfig: {
          direction: 'lower',
          deliveredStatuses: ['delivered'],
          returnedStatuses: ['returned'],
        },
        teamMonthlyTarget: 8,
        periodType: 'monthly',
        isActive: true,
        prorataAboveTop: false,
        sortOrder: 1,
        slabs: [
          {
            id: 'r1',
            label: '≤4%',
            monthlyTarget: 4,
            incentiveBdt: 2500,
            sortOrder: 0,
          },
          {
            id: 'r2',
            label: '≤8%',
            monthlyTarget: 8,
            incentiveBdt: 500,
            sortOrder: 1,
          },
        ],
        assignmentCount: 0,
      },
    ],
    assignments: [],
    salaryTemplate: DEFAULT_SALARY,
    shiftTemplates: DEFAULT_INCENTIVE_SHIFTS,
    teamCount: 2,
    planCount: 2,
    assignmentCount: 0,
  };
}

let store: IncentiveOverview = getEmptyIncentiveOverview(false);
let periods: IncentivePeriodRun[] = [];
const opsByMonth = new Map<string, IncentiveOpsMonth>();
const manualActuals = new Map<string, { actualValue: number; note?: string | null }>();

export function mutateMockIncentiveOps<T>(
  yearMonth: string,
  fn: (ops: IncentiveOpsMonth) => T,
): T {
  let ops = opsByMonth.get(yearMonth);
  if (!ops) {
    ops = {
      yearMonth,
      attendance: [],
      surveys: [],
      channels: [],
      specialBonuses: [],
    };
    opsByMonth.set(yearMonth, ops);
  }
  return fn(ops);
}

export function deleteMockSpecialBonus(id: string) {
  for (const ops of opsByMonth.values()) {
    ops.specialBonuses = ops.specialBonuses.filter((row) => row.id !== id);
  }
}

export function upsertMockOpsRow<T extends { id: string }>(
  rows: T[],
  next: T,
  matches: (row: T) => boolean,
): T[] {
  const index = rows.findIndex(matches);
  if (index < 0) return [...rows, next];
  return rows.map((row, rowIndex) => (rowIndex === index ? next : row));
}

export function mutateMockIncentive<T>(fn: (s: IncentiveOverview) => T): T {
  return fn(store);
}

export function mutateMockIncentivePeriods<T>(fn: (rows: IncentivePeriodRun[]) => T): T {
  return fn(periods);
}

export function replaceMockIncentivePeriods(next: IncentivePeriodRun[]) {
  periods = next;
}

export function setMockManualActual(
  assignmentId: string,
  yearMonth: string,
  value: { actualValue: number; note?: string | null },
) {
  manualActuals.set(`${assignmentId}:${yearMonth}`, value);
}

export function getMockManualActual(assignmentId: string, yearMonth: string) {
  return manualActuals.get(`${assignmentId}:${yearMonth}`);
}

export function resetMockIncentive() {
  store = getEmptyIncentiveOverview(false);
  periods = [];
  opsByMonth.clear();
  manualActuals.clear();
}

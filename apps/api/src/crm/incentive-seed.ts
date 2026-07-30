import type {
  IncentiveMetricConfig,
  IncentiveMetricType,
  IncentiveShiftTemplate,
} from '@laam/types';

type SeedSlab = {
  label?: string;
  dailyTarget?: number | null;
  monthlyTarget: number;
  incentiveBdt: number;
};

type SeedPlan = {
  name: string;
  slug: string;
  description?: string;
  metricType: IncentiveMetricType;
  metricConfig?: IncentiveMetricConfig;
  prorataAboveTop?: boolean;
  teamMonthlyTarget?: number | null;
  slabs: SeedSlab[];
};

type SeedTeam = {
  name: string;
  slug: string;
  description: string;
  plan?: SeedPlan;
};

export const LAAM_SHIFT_TEMPLATES: IncentiveShiftTemplate[] = [
  {
    id: 'morning',
    name: 'Morning',
    startTime: '09:00',
    endTime: '18:00',
    reportingTime: '08:50',
  },
  {
    id: 'evening',
    name: 'Evening',
    startTime: '13:00',
    endTime: '22:00',
    reportingTime: '12:50',
  },
  {
    id: 'night',
    name: 'Night',
    startTime: '22:00',
    endTime: '07:00',
    notes: 'Night shift support — call / FB / Messenger / WhatsApp',
  },
];

/** Default template mirrored from Laam Salary/Incentive/KPI PDF — tenants customize after seed. */
export const LAAM_INCENTIVE_SEED = {
  salary: {
    basicBdt: 5600,
    houseRentBdt: 4200,
    medicalBdt: 2800,
    conveyanceBdt: 1400,
    grossBdt: 14000,
    attendanceBonusBdt: 1000,
    lunchBdt: 1000,
    totalBdt: 16000,
    notes: 'Reference salary template — editable per tenant. Attendance bonus requires full attendance.',
  },
  shifts: LAAM_SHIFT_TEMPLATES,
  teams: [
    {
      name: 'Telesales',
      slug: 'telesales',
      description:
        'Old-customer outreach, product consultation, successful verified orders.',
      plan: {
        name: 'Telesales monthly orders',
        slug: 'telesales-orders',
        metricType: 'order_count',
        metricConfig: {
          includeStatuses: ['confirmed', 'delivered', 'completed', 'in_courier'],
          excludeStatuses: ['cancelled', 'canceled', 'failed', 'duplicate'],
        },
        prorataAboveTop: true,
        slabs: [
          { label: '8/day', dailyTarget: 8, monthlyTarget: 208, incentiveBdt: 1000 },
          { label: '10/day', dailyTarget: 10, monthlyTarget: 260, incentiveBdt: 3000 },
          { label: '12/day', dailyTarget: 12, monthlyTarget: 312, incentiveBdt: 4000 },
          { label: '15/day', dailyTarget: 15, monthlyTarget: 390, incentiveBdt: 5000 },
          { label: '20/day', dailyTarget: 20, monthlyTarget: 520, incentiveBdt: 7000 },
        ],
      },
    },
    {
      name: 'Confirmation',
      slug: 'confirmation',
      description: 'Confirm pending orders; cross-sell / upsell incentives.',
      plan: {
        name: 'Confirmation cross-sell',
        slug: 'confirmation-cross-sell',
        metricType: 'cross_sell_count',
        teamMonthlyTarget: 2350,
        metricConfig: {
          minItems: 2,
          orderTags: ['cross-sell', 'upsell'],
          excludeStatuses: ['cancelled', 'canceled', 'failed', 'duplicate', 'returned'],
        },
        slabs: [
          { label: '25/day', dailyTarget: 25, monthlyTarget: 650, incentiveBdt: 1000 },
          { label: '30/day', dailyTarget: 30, monthlyTarget: 750, incentiveBdt: 3000 },
          { label: '35/day', dailyTarget: 35, monthlyTarget: 900, incentiveBdt: 4000 },
          { label: '40/day', dailyTarget: 40, monthlyTarget: 1000, incentiveBdt: 5000 },
          { label: '45/day', dailyTarget: 45, monthlyTarget: 1100, incentiveBdt: 7000 },
        ],
      },
    },
    {
      name: 'Digital / Inbound',
      slug: 'digital-inbound',
      description: 'Inbound leads → successful delivered orders.',
      plan: {
        name: 'Inbound delivered orders',
        slug: 'inbound-orders',
        metricType: 'order_count',
        metricConfig: {
          includeStatuses: ['delivered', 'completed'],
          excludeStatuses: ['cancelled', 'canceled', 'failed', 'duplicate'],
        },
        slabs: [
          { label: '40/day', dailyTarget: 40, monthlyTarget: 1040, incentiveBdt: 1000 },
          { label: '45/day', dailyTarget: 45, monthlyTarget: 1170, incentiveBdt: 2000 },
          { label: '50/day', dailyTarget: 50, monthlyTarget: 1300, incentiveBdt: 3000 },
          { label: '55/day', dailyTarget: 55, monthlyTarget: 1430, incentiveBdt: 4000 },
          { label: '60/day', dailyTarget: 60, monthlyTarget: 1560, incentiveBdt: 5000 },
        ],
      },
    },
    {
      name: 'Outbound',
      slug: 'outbound',
      description: 'Follow-up / database conversion (HDC & others).',
      plan: {
        name: 'Outbound monthly orders',
        slug: 'outbound-orders',
        metricType: 'order_count',
        metricConfig: {
          includeStatuses: ['confirmed', 'delivered', 'completed', 'in_courier'],
          excludeStatuses: ['cancelled', 'canceled', 'failed', 'duplicate'],
        },
        slabs: [
          { label: '8/day', dailyTarget: 8, monthlyTarget: 208, incentiveBdt: 1000 },
          { label: '10/day', dailyTarget: 10, monthlyTarget: 260, incentiveBdt: 3000 },
          { label: '12/day', dailyTarget: 12, monthlyTarget: 312, incentiveBdt: 4000 },
          { label: '15/day', dailyTarget: 15, monthlyTarget: 390, incentiveBdt: 5000 },
          { label: '25/day', dailyTarget: 25, monthlyTarget: 650, incentiveBdt: 7000 },
        ],
      },
    },
    {
      name: 'Logistic',
      slug: 'logistic',
      description: 'Courier delivery success — lower return ratio earns more.',
      plan: {
        name: 'Logistic return ratio',
        slug: 'logistic-return-ratio',
        metricType: 'return_ratio',
        metricConfig: {
          direction: 'lower',
          deliveredStatuses: ['delivered', 'completed', 'hand_delivery_completed'],
          returnedStatuses: ['returned', 'pending_return'],
        },
        slabs: [
          { label: '≤4%', monthlyTarget: 4, incentiveBdt: 2500 },
          { label: '≤5%', monthlyTarget: 5, incentiveBdt: 2000 },
          { label: '≤6%', monthlyTarget: 6, incentiveBdt: 1500 },
          { label: '≤7%', monthlyTarget: 7, incentiveBdt: 1000 },
          { label: '≤8%', monthlyTarget: 8, incentiveBdt: 500 },
        ],
      },
    },
    {
      name: 'Incomplete recovery',
      slug: 'incomplete-recovery',
      description: 'Recover incomplete / pending orders to completed.',
      plan: {
        name: 'Incomplete recovery completes',
        slug: 'incomplete-recovery-orders',
        metricType: 'recovery_count',
        metricConfig: {
          includeStatuses: ['confirmed', 'delivered', 'completed'],
          excludeStatuses: ['cancelled', 'canceled', 'failed', 'duplicate'],
        },
        slabs: [
          { label: '70/day', dailyTarget: 70, monthlyTarget: 1800, incentiveBdt: 1000 },
          { label: '75/day', dailyTarget: 75, monthlyTarget: 1950, incentiveBdt: 2000 },
          { label: '80/day', dailyTarget: 80, monthlyTarget: 2100, incentiveBdt: 3000 },
          { label: '85/day', dailyTarget: 85, monthlyTarget: 2200, incentiveBdt: 4000 },
          { label: '90/day', dailyTarget: 90, monthlyTarget: 2400, incentiveBdt: 5000 },
        ],
      },
    },
    {
      name: 'Relationship',
      slug: 'relationship',
      description: 'Post-delivery survey & customer follow-up (enter monthly survey count manually).',
      plan: {
        name: 'Relationship surveys',
        slug: 'relationship-surveys',
        metricType: 'manual',
        description: 'Enter verified survey completions each month.',
        slabs: [
          { label: 'Entry', monthlyTarget: 200, incentiveBdt: 1000 },
          { label: 'Good', monthlyTarget: 350, incentiveBdt: 2500 },
          { label: 'Top', monthlyTarget: 500, incentiveBdt: 4000 },
        ],
      },
    },
    {
      name: 'Night shift support',
      slug: 'night-shift',
      description: '22:00–07:00 support across call / FB / Messenger / WhatsApp.',
      plan: {
        name: 'Night shift orders',
        slug: 'night-shift-orders',
        metricType: 'order_count',
        metricConfig: {
          includeStatuses: ['confirmed', 'delivered', 'completed', 'in_courier'],
          excludeStatuses: ['cancelled', 'canceled', 'failed', 'duplicate'],
        },
        slabs: [
          { label: 'Soft', monthlyTarget: 150, incentiveBdt: 1500 },
          { label: 'Target', monthlyTarget: 200, incentiveBdt: 3000 },
          { label: 'Stretch', monthlyTarget: 260, incentiveBdt: 5000 },
        ],
      },
    },
  ] satisfies SeedTeam[],
};

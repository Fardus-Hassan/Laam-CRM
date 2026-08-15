import {
  matchIncentiveSlab,
  evaluateMiss,
  resolveIncentiveWarning,
  nextHrStatus,
  applyReturnRatioCap,
  countRecoveries,
} from './incentive-calc';

describe('matchIncentiveSlab', () => {
  const orderSlabs = [
    { id: 'a', label: '8', monthlyTarget: 208, incentiveBdt: 1000 },
    { id: 'b', label: '10', monthlyTarget: 260, incentiveBdt: 3000 },
    { id: 'c', label: '20', monthlyTarget: 520, incentiveBdt: 7000 },
  ];

  const returnSlabs = [
    { id: 'r4', label: '≤4%', monthlyTarget: 4, incentiveBdt: 2500 },
    { id: 'r5', label: '≤5%', monthlyTarget: 5, incentiveBdt: 2000 },
    { id: 'r8', label: '≤8%', monthlyTarget: 8, incentiveBdt: 500 },
  ];

  it('picks highest qualifying slab for order count', () => {
    const m = matchIncentiveSlab(orderSlabs, 300, 'higher', false);
    expect(m.slab?.id).toBe('b');
    expect(m.incentiveBdt).toBe(3000);
  });

  it('applies prorata above top slab', () => {
    const m = matchIncentiveSlab(orderSlabs, 780, 'higher', true);
    expect(m.prorataApplied).toBe(true);
    expect(m.incentiveBdt).toBe(Math.round((7000 * 780) / 520));
  });

  it('picks tightest return-ratio slab (lower is better)', () => {
    const m = matchIncentiveSlab(returnSlabs, 4.5, 'lower', false);
    expect(m.slab?.id).toBe('r5');
    expect(m.incentiveBdt).toBe(2000);
  });

  it('pays zero when below all higher targets', () => {
    const m = matchIncentiveSlab(orderSlabs, 100, 'higher', false);
    expect(m.slab).toBeNull();
    expect(m.incentiveBdt).toBe(0);
  });

  it('pays zero when return ratio exceeds all slabs', () => {
    const m = matchIncentiveSlab(returnSlabs, 12, 'lower', false);
    expect(m.slab).toBeNull();
    expect(m.incentiveBdt).toBe(0);
  });
});

describe('evaluateMiss / resolveIncentiveWarning', () => {
  const orderSlabs = [
    { id: 'a', monthlyTarget: 208, incentiveBdt: 1000 },
    { id: 'b', monthlyTarget: 520, incentiveBdt: 7000 },
  ];

  it('flags miss below entry target', () => {
    expect(evaluateMiss('higher', 100, orderSlabs)).toBe(true);
    expect(evaluateMiss('higher', 208, orderSlabs)).toBe(false);
  });

  it('escalates to final_warning after 2 misses', () => {
    expect(
      resolveIncentiveWarning({
        direction: 'higher',
        actual: 50,
        slabs: orderSlabs,
        consecutiveMissMonths: 2,
      }),
    ).toBe('final_warning');
  });

  it('flags manual_missing', () => {
    expect(
      resolveIncentiveWarning({
        direction: 'higher',
        actual: 0,
        slabs: orderSlabs,
        consecutiveMissMonths: 0,
        manualMissing: true,
      }),
    ).toBe('manual_missing');
  });

  it('flags below_daily_entry', () => {
    expect(
      resolveIncentiveWarning({
        direction: 'higher',
        actual: 208,
        slabs: orderSlabs,
        consecutiveMissMonths: 0,
        entryDailyTarget: 8,
        dailyAverage: 6,
      }),
    ).toBe('below_daily_entry');
  });

  it('advances HR status on consecutive misses', () => {
    expect(nextHrStatus('active', true)).toEqual({
      hrStatus: 'warning',
      consecutiveMissMonths: 1,
    });
    expect(nextHrStatus('warning', true)).toEqual({
      hrStatus: 'final_warning',
      consecutiveMissMonths: 2,
    });
    expect(nextHrStatus('final_warning', true)).toEqual({
      hrStatus: 'terminated',
      consecutiveMissMonths: 3,
    });
    expect(nextHrStatus('warning', false)).toEqual({
      hrStatus: 'active',
      consecutiveMissMonths: 0,
    });
  });

  it('flags above_return_cap when returnCapped', () => {
    expect(
      resolveIncentiveWarning({
        direction: 'higher',
        actual: 300,
        slabs: orderSlabs,
        consecutiveMissMonths: 0,
        returnCapped: true,
      }),
    ).toBe('above_return_cap');
  });
});

describe('applyReturnRatioCap', () => {
  it('zeros incentive when personal return exceeds plan max', () => {
    expect(
      applyReturnRatioCap({
        incentiveBdt: 7000,
        returnRatioPct: 16,
        maxAgentReturnRatioPct: 15,
      }),
    ).toEqual({ incentiveBdt: 0, capped: true });
  });

  it('keeps incentive at or under the cap', () => {
    expect(
      applyReturnRatioCap({
        incentiveBdt: 7000,
        returnRatioPct: 15,
        maxAgentReturnRatioPct: 15,
      }),
    ).toEqual({ incentiveBdt: 7000, capped: false });
  });

  it('no-ops when max is unset', () => {
    expect(
      applyReturnRatioCap({
        incentiveBdt: 3000,
        returnRatioPct: 40,
        maxAgentReturnRatioPct: null,
      }),
    ).toEqual({ incentiveBdt: 3000, capped: false });
  });
});

describe('countRecoveries', () => {
  const periodStart = new Date('2026-08-01T00:00:00.000Z');
  const periodEnd = new Date('2026-08-31T23:59:59.999Z');

  it('counts incomplete → success within the period', () => {
    const n = countRecoveries({
      orderIds: ['o1', 'o2'],
      activities: [
        {
          orderId: 'o1',
          description: 'incomplete',
          createdAt: new Date('2026-08-05T10:00:00.000Z'),
        },
        {
          orderId: 'o1',
          description: 'delivered',
          createdAt: new Date('2026-08-12T10:00:00.000Z'),
        },
        {
          orderId: 'o2',
          description: 'pending',
          createdAt: new Date('2026-08-03T10:00:00.000Z'),
        },
      ],
      successStatuses: ['delivered', 'completed'],
      recoveryFromStatuses: ['incomplete', 'hold', 'pending'],
      periodStart,
      periodEnd,
    });
    expect(n).toBe(1);
  });

  it('counts tag-based recovery without prior incomplete activity', () => {
    const n = countRecoveries({
      orderIds: ['o3'],
      activities: [
        {
          orderId: 'o3',
          description: 'delivered',
          createdAt: new Date('2026-08-20T10:00:00.000Z'),
        },
      ],
      successStatuses: ['delivered'],
      recoveryFromStatuses: ['incomplete'],
      periodStart,
      periodEnd,
      orderTagsById: new Map([['o3', 'recovery']]),
    });
    expect(n).toBe(1);
  });
});

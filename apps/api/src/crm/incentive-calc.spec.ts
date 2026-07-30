import { matchIncentiveSlab, evaluateMiss, resolveIncentiveWarning } from './incentive-calc';

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
});

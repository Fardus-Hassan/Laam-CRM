export type IncentiveSlabLike = {
  id: string;
  label?: string | null;
  monthlyTarget: number;
  incentiveBdt: number;
};

export function matchIncentiveSlab(
  slabs: IncentiveSlabLike[],
  actual: number,
  direction: 'higher' | 'lower',
  prorataAboveTop: boolean,
): { slab: IncentiveSlabLike | null; incentiveBdt: number; prorataApplied: boolean } {
  if (!slabs.length) return { slab: null, incentiveBdt: 0, prorataApplied: false };

  if (direction === 'lower') {
    const eligible = slabs
      .filter((s) => actual <= s.monthlyTarget)
      .sort((a, b) => a.monthlyTarget - b.monthlyTarget);
    const slab = eligible[0] ?? null;
    return { slab, incentiveBdt: slab?.incentiveBdt ?? 0, prorataApplied: false };
  }

  const sorted = [...slabs].sort((a, b) => a.monthlyTarget - b.monthlyTarget);
  const qualifying = sorted.filter((s) => actual >= s.monthlyTarget);
  if (!qualifying.length) {
    return { slab: null, incentiveBdt: 0, prorataApplied: false };
  }
  const top = sorted[sorted.length - 1]!;
  const best = qualifying[qualifying.length - 1]!;

  if (prorataAboveTop && actual > top.monthlyTarget && top.monthlyTarget > 0) {
    const incentiveBdt = Math.round((top.incentiveBdt * actual) / top.monthlyTarget);
    return { slab: top, incentiveBdt, prorataApplied: true };
  }

  return { slab: best, incentiveBdt: best.incentiveBdt, prorataApplied: false };
}

/** True when agent missed the entry threshold for the period. */
export function evaluateMiss(
  direction: 'higher' | 'lower',
  actual: number,
  slabs: IncentiveSlabLike[],
  opts?: { manualMissing?: boolean },
): boolean {
  if (opts?.manualMissing) return true;
  if (!slabs.length) return false;
  const match = matchIncentiveSlab(slabs, actual, direction, false);
  if (direction === 'higher') {
    const entry = Math.min(...slabs.map((s) => s.monthlyTarget));
    return actual < entry || match.slab === null;
  }
  return match.slab === null;
}

export function resolveIncentiveWarning(input: {
  direction: 'higher' | 'lower';
  actual: number;
  slabs: IncentiveSlabLike[];
  consecutiveMissMonths: number;
  manualMissing?: boolean;
  hrStatus?: 'active' | 'warning' | 'final_warning' | 'terminated';
  entryDailyTarget?: number | null;
  dailyAverage?: number | null;
}): 'none' | 'below_target' | 'below_daily_entry' | 'above_return_cap' | 'manual_missing' | 'final_warning' | 'terminated' {
  if (input.hrStatus === 'terminated') return 'terminated';
  if (input.manualMissing) return 'manual_missing';
  if (input.consecutiveMissMonths >= 2 || input.hrStatus === 'final_warning') return 'final_warning';
  if (
    input.entryDailyTarget != null &&
    input.dailyAverage != null &&
    input.dailyAverage < input.entryDailyTarget
  ) {
    return 'below_daily_entry';
  }
  const missed = evaluateMiss(input.direction, input.actual, input.slabs);
  if (!missed) return 'none';
  return input.direction === 'lower' ? 'above_return_cap' : 'below_target';
}

export function nextHrStatus(
  current: 'active' | 'warning' | 'final_warning' | 'terminated',
  missedThisMonth: boolean,
): { hrStatus: 'active' | 'warning' | 'final_warning' | 'terminated'; consecutiveMissMonths: number } {
  if (current === 'terminated') {
    return { hrStatus: 'terminated', consecutiveMissMonths: 99 };
  }
  if (!missedThisMonth) {
    return { hrStatus: 'active', consecutiveMissMonths: 0 };
  }
  if (current === 'active' || current === 'warning') {
    const nextMiss = current === 'active' ? 1 : 2;
    if (nextMiss >= 2) return { hrStatus: 'final_warning', consecutiveMissMonths: 2 };
    return { hrStatus: 'warning', consecutiveMissMonths: 1 };
  }
  // final_warning + another miss → terminated
  return { hrStatus: 'terminated', consecutiveMissMonths: 3 };
}

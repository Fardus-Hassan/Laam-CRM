export type IncentiveSlabLike = {
  id: string;
  label?: string | null;
  monthlyTarget: number;
  incentiveBdt: number;
};

export function normalizeAgentKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function assignmentMatchKeys(input: {
  userId?: string | null;
  agentName: string;
}): string[] {
  const keys: string[] = [];
  const userId = input.userId?.trim();
  if (userId) keys.push(`u:${userId}`);
  const name = normalizeAgentKey(input.agentName);
  if (name) keys.push(`n:${name}`);
  return keys;
}

export function orderMatchKeys(input: {
  assignedUserId?: string | null;
  assignedAgentName?: string | null;
}): string[] {
  return assignmentMatchKeys({
    userId: input.assignedUserId,
    agentName: input.assignedAgentName ?? '',
  });
}

export function computeReturnRatioPct(input: {
  delivered: number;
  returned: number;
}): number {
  const denom = input.delivered + input.returned;
  if (denom <= 0) return 0;
  return Math.round((input.returned / denom) * 10000) / 100;
}

/**
 * PDF quality gate: when personal return ratio exceeds plan max, zero incentive.
 */
export function applyReturnRatioCap(input: {
  incentiveBdt: number;
  returnRatioPct: number;
  maxAgentReturnRatioPct?: number | null;
}): { incentiveBdt: number; capped: boolean } {
  const max = input.maxAgentReturnRatioPct;
  if (max == null || !Number.isFinite(max)) {
    return { incentiveBdt: input.incentiveBdt, capped: false };
  }
  if (input.returnRatioPct > max) {
    return { incentiveBdt: 0, capped: true };
  }
  return { incentiveBdt: input.incentiveBdt, capped: false };
}

export type StatusActivityLike = {
  orderId: string;
  description: string | null;
  createdAt: Date;
};

/**
 * Count recoveries: order reached a success status in-period after having been
 * in an incomplete/recovery-from status (earlier activity or tag).
 */
export function countRecoveries(input: {
  orderIds: string[];
  activities: StatusActivityLike[];
  successStatuses: string[];
  recoveryFromStatuses: string[];
  periodStart: Date;
  periodEnd: Date;
  orderTagsById?: Map<string, string | null | undefined>;
}): number {
  const success = new Set(input.successStatuses.map((s) => s.toLowerCase()));
  const from = new Set(input.recoveryFromStatuses.map((s) => s.toLowerCase()));
  const byOrder = new Map<string, StatusActivityLike[]>();
  for (const a of input.activities) {
    const list = byOrder.get(a.orderId) ?? [];
    list.push(a);
    byOrder.set(a.orderId, list);
  }

  let count = 0;
  for (const orderId of input.orderIds) {
    const events = (byOrder.get(orderId) ?? []).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const tag = input.orderTagsById?.get(orderId)?.toLowerCase() ?? '';
    const taggedRecovery = tag.includes('recovery') || tag.includes('incomplete');

    let sawIncomplete = taggedRecovery;
    let recoveredInPeriod = false;
    for (const ev of events) {
      const status = (ev.description ?? '').trim().toLowerCase();
      if (!status) continue;
      if (from.has(status)) sawIncomplete = true;
      const inPeriod =
        ev.createdAt >= input.periodStart && ev.createdAt <= input.periodEnd;
      if (inPeriod && sawIncomplete && success.has(status)) {
        recoveredInPeriod = true;
        break;
      }
    }
    if (recoveredInPeriod) count += 1;
  }
  return count;
}

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
  returnCapped?: boolean;
}): 'none' | 'below_target' | 'below_daily_entry' | 'above_return_cap' | 'manual_missing' | 'final_warning' | 'terminated' {
  if (input.hrStatus === 'terminated') return 'terminated';
  if (input.manualMissing) return 'manual_missing';
  if (input.returnCapped) return 'above_return_cap';
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

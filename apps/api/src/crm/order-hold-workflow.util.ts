/** Bangladesh (UTC+6) — day boundaries for hold follow-up automation. */
export const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
export const HOLD_SCAN_MS = 15 * 60 * 1000;
export const EOD_HOUR_DHAKA = 23;

/** Postgres advisory lock keys — unique to this job across API instances. */
export const HOLD_WORKFLOW_LOCK_CLASS = 88420124;
export const HOLD_WORKFLOW_LOCK_ID = 17;

export function dhakaYmd(now = new Date()): string {
  const d = new Date(now.getTime() + BD_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function dhakaHour(now = new Date()): number {
  return new Date(now.getTime() + BD_OFFSET_MS).getUTCHours();
}

/** Calendar YMD stored as UTC midnight (matches OrdersService.parseFollowUpDateOrThrow). */
export function utcDateOnlyFromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDaysToYmd(ymd: string, days: number): string {
  const base = utcDateOnlyFromYmd(ymd);
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

/** Due = schedule on/before today's Dhaka calendar date (inclusive). */
export function isFollowUpDueOnOrBefore(scheduleUtcMidnight: Date, todayYmd: string): boolean {
  return scheduleUtcMidnight.getTime() <= utcDateOnlyFromYmd(todayYmd).getTime();
}

export function shouldRunEodRevert(now = new Date(), lastEodYmd: string | null): boolean {
  const ymd = dhakaYmd(now);
  return dhakaHour(now) >= EOD_HOUR_DHAKA && lastEodYmd !== ymd;
}

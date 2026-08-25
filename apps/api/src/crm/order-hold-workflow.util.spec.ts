import {
  addDaysToYmd,
  dhakaHour,
  dhakaYmd,
  isFollowUpDueOnOrBefore,
  shouldRunEodRevert,
  utcDateOnlyFromYmd,
} from './order-hold-workflow.util';

describe('order-hold-workflow date helpers', () => {
  it('formats Dhaka YMD from a UTC instant', () => {
    // 2026-08-23 18:30 UTC = 2026-08-24 00:30 Dhaka
    expect(dhakaYmd(new Date('2026-08-23T18:30:00.000Z'))).toBe('2026-08-24');
    // still previous Dhaka day just before midnight+6
    expect(dhakaYmd(new Date('2026-08-23T17:59:00.000Z'))).toBe('2026-08-23');
  });

  it('returns Dhaka hour', () => {
    expect(dhakaHour(new Date('2026-08-24T17:00:00.000Z'))).toBe(23);
    expect(dhakaHour(new Date('2026-08-24T16:59:00.000Z'))).toBe(22);
  });

  it('stores calendar days as UTC midnight', () => {
    expect(utcDateOnlyFromYmd('2026-08-24').toISOString()).toBe('2026-08-24T00:00:00.000Z');
  });

  it('adds calendar days without timezone drift', () => {
    expect(addDaysToYmd('2026-08-24', 1)).toBe('2026-08-25');
    expect(addDaysToYmd('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('treats follow-up as due on or before today (inclusive)', () => {
    const today = utcDateOnlyFromYmd('2026-08-24');
    const yesterday = utcDateOnlyFromYmd('2026-08-23');
    const tomorrow = utcDateOnlyFromYmd('2026-08-25');
    expect(isFollowUpDueOnOrBefore(today, '2026-08-24')).toBe(true);
    expect(isFollowUpDueOnOrBefore(yesterday, '2026-08-24')).toBe(true);
    expect(isFollowUpDueOnOrBefore(tomorrow, '2026-08-24')).toBe(false);
  });

  it('runs EOD revert once per Dhaka day after 23:00', () => {
    const eod = new Date('2026-08-24T17:05:00.000Z'); // 23:05 Dhaka
    expect(shouldRunEodRevert(eod, null)).toBe(true);
    expect(shouldRunEodRevert(eod, '2026-08-24')).toBe(false);
    expect(shouldRunEodRevert(new Date('2026-08-24T16:00:00.000Z'), null)).toBe(false);
  });
});

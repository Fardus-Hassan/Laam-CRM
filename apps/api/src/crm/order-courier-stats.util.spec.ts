import { buildCourierStatsFromStatusCounts } from './order-courier-stats.util';

describe('buildCourierStatsFromStatusCounts', () => {
  it('computes success rate from Su/Fa', () => {
    const stats = buildCourierStatsFromStatusCounts({
      completed: 8,
      returned: 2,
    });
    expect(stats).toMatchObject({ to: 10, su: 8, fa: 2, percent: 80, co: 0 });
    expect(stats.label).toBe('Frequent');
  });

  it('counts in_courier as Co', () => {
    const stats = buildCourierStatsFromStatusCounts({
      in_courier: 2,
      pending: 1,
      delivered: 1,
    });
    expect(stats.to).toBe(4);
    expect(stats.co).toBe(2);
    expect(stats.su).toBe(1);
    expect(stats.fa).toBe(0);
  });

  it('marks risky when fail rate is high', () => {
    const stats = buildCourierStatsFromStatusCounts({
      cancelled: 3,
      returned: 2,
      delivered: 1,
    });
    expect(stats.percent).toBe(17);
    expect(stats.label).toBe('Risky');
  });
});

import { clampPageSize, CRM_MAX_PAGE_SIZE } from './pagination';

describe('clampPageSize', () => {
  it('clamps to 1..CRM_MAX_PAGE_SIZE', () => {
    expect(clampPageSize(0)).toBe(1);
    expect(clampPageSize(-5)).toBe(1);
    expect(clampPageSize(50)).toBe(50);
    expect(clampPageSize(5000)).toBe(CRM_MAX_PAGE_SIZE);
    expect(clampPageSize(undefined, 20)).toBe(20);
    expect(clampPageSize(Number.NaN, 15)).toBe(15);
    expect(clampPageSize(12.9)).toBe(12);
  });
});

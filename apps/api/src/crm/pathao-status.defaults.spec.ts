import {
  isPathaoCancelledStatus,
  normalizePathaoStatusSlug,
} from './pathao-status.defaults';

describe('pathao status helpers', () => {
  it('normalizes Pickup Cancel display labels to pickup_cancelled', () => {
    expect(normalizePathaoStatusSlug('Pickup Cancel')).toBe('pickup_cancelled');
    expect(normalizePathaoStatusSlug('Pickup Cancelled')).toBe('pickup_cancelled');
    expect(normalizePathaoStatusSlug('Cancelled')).toBe('pickup_cancelled');
    expect(normalizePathaoStatusSlug('pending')).toBe('pending');
  });

  it('detects cancelled Pathao statuses', () => {
    expect(isPathaoCancelledStatus('Pending')).toBe(false);
    expect(isPathaoCancelledStatus('Pickup Cancel')).toBe(true);
    expect(isPathaoCancelledStatus('Pending', 'pickup_cancelled')).toBe(true);
    expect(isPathaoCancelledStatus('Cancelled')).toBe(true);
  });
});

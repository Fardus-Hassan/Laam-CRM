import { normalizeBdPhone, phonesMatch } from './phone.util';

describe('normalizeBdPhone', () => {
  it('keeps local 01XXXXXXXXX numbers', () => {
    expect(normalizeBdPhone('01712345678')).toBe('01712345678');
  });

  it('strips spaces and punctuation', () => {
    expect(normalizeBdPhone('017-1234 5678')).toBe('01712345678');
  });

  it('converts +880 / 880 country codes to local form', () => {
    expect(normalizeBdPhone('+8801712345678')).toBe('01712345678');
    expect(normalizeBdPhone('8801712345678')).toBe('01712345678');
  });

  it('prefixes bare 10-digit mobiles starting with 1', () => {
    expect(normalizeBdPhone('1712345678')).toBe('01712345678');
  });

  it('returns empty for blank input', () => {
    expect(normalizeBdPhone('')).toBe('');
    expect(normalizeBdPhone(null)).toBe('');
  });
});

describe('phonesMatch', () => {
  it('matches equivalent BD phone formats', () => {
    expect(phonesMatch('01712345678', '+8801712345678')).toBe(true);
    expect(phonesMatch('01712345678', '01812345678')).toBe(false);
  });
});

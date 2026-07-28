/**
 * Bangladesh mobile normalization for COD CRM identity.
 * Stores/compares as local 01XXXXXXXXX (11 digits) when possible.
 */
export function normalizeBdPhone(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 11 && digits.startsWith('01')) return digits;
  if (digits.length === 13 && digits.startsWith('880') && digits[3] === '1') {
    return `0${digits.slice(3)}`;
  }
  if (digits.length === 14 && digits.startsWith('8800') && digits[4] === '1') {
    return `0${digits.slice(4)}`;
  }
  if (digits.length === 10 && digits.startsWith('1')) {
    return `0${digits}`;
  }
  return digits;
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizeBdPhone(a);
  const nb = normalizeBdPhone(b);
  return Boolean(na) && na === nb;
}

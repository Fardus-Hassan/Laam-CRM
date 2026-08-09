/** Shared inventory helpers (kept out of service files to avoid circular imports). */

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

/** Converts a Prisma Decimal (or number/string) to a plain number. */
export function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  const maybe = value as { toNumber?: () => number };
  if (typeof maybe.toNumber === 'function') return maybe.toNumber();
  return Number(value);
}

export type Actor = { userId?: string; name?: string };

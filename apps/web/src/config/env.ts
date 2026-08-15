const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

function normalizePlatformDomain(raw?: string): string {
  return (raw ?? '').trim().toLowerCase().replace(/^www\./, '');
}

export const env = {
  apiUrl,
  useApi: process.env.NEXT_PUBLIC_USE_API === 'true',
  isDev: process.env.NODE_ENV === 'development',
  enableRoleSwitch: process.env.NEXT_PUBLIC_ENABLE_ROLE_SWITCH === 'true',
  /** Apex domain for tenants (test/prod). Empty = localhost-only. */
  platformDomain: normalizePlatformDomain(process.env.NEXT_PUBLIC_PLATFORM_DOMAIN),
} as const;

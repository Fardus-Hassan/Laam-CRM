import { env } from '@/config/env';

const DEVICE_KEY = 'laam_device_id';

export {
  getStoredAccessToken,
  setStoredAccessToken,
} from '@/lib/auth-token';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}

function apexDomain(): string {
  return env.platformDomain || 'laamcrm.com';
}

function isLocalHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');
}

/**
 * Resolve tenant slug from hostname.
 * - localhost → platform (null)
 * - laam.localhost → laam
 * - laam.{PLATFORM_DOMAIN} → laam
 */
export function getTenantSlugFromHost(hostname?: string): string | null {
  const host = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }
  if (host.endsWith('.localhost')) {
    return host.replace(/\.localhost$/, '') || null;
  }
  const domain = apexDomain();
  if (host === domain || host === `www.${domain}`) {
    return null;
  }
  if (host.endsWith(`.${domain}`)) {
    const slug = host.slice(0, -(domain.length + 1));
    return slug.split('.')[0] || null;
  }
  return null;
}

export function isPlatformHost(hostname?: string): boolean {
  return getTenantSlugFromHost(hostname) === null;
}

export function tenantDashboardUrl(slug: string): string {
  return tenantOrigin(slug) + '/dashboard';
}

export function tenantLoginUrl(slug: string): string {
  return tenantOrigin(slug) + '/login';
}

export function platformLoginUrl(): string {
  if (typeof window === 'undefined') {
    const domain = env.platformDomain;
    return domain ? `https://${domain}/login` : 'http://localhost:3000/login';
  }
  const { protocol, port, hostname } = window.location;
  if (isLocalHost(hostname)) {
    const portSuffix = port ? `:${port}` : '';
    return `${protocol}//localhost${portSuffix}/login`;
  }
  return `${protocol}//${apexDomain()}/login`;
}

function tenantOrigin(slug: string): string {
  if (typeof window === 'undefined') {
    const domain = env.platformDomain;
    return domain ? `https://${slug}.${domain}` : `http://${slug}.localhost:3000`;
  }
  const { protocol, port, hostname } = window.location;
  if (isLocalHost(hostname)) {
    const portSuffix = port ? `:${port}` : '';
    return `${protocol}//${slug}.localhost${portSuffix}`;
  }
  return `${protocol}//${slug}.${apexDomain()}`;
}

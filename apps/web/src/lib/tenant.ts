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

/**
 * Resolve tenant slug from hostname.
 * - localhost → platform (null)
 * - laam.localhost → laam
 * - laam.laamcrm.com → laam
 */
export function getTenantSlugFromHost(hostname?: string): string | null {
  const host = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }
  if (host.endsWith('.localhost')) {
    return host.replace(/\.localhost$/, '') || null;
  }
  const parts = host.split('.');
  if (parts.length >= 3 && parts[1] === 'laamcrm') {
    return parts[0] || null;
  }
  return null;
}

export function isPlatformHost(hostname?: string): boolean {
  return getTenantSlugFromHost(hostname) === null;
}

export function tenantDashboardUrl(slug: string): string {
  if (typeof window === 'undefined') {
    return `http://${slug}.localhost:3000/dashboard`;
  }
  const { protocol, port } = window.location;
  const portSuffix = port ? `:${port}` : '';
  return `${protocol}//${slug}.localhost${portSuffix}/dashboard`;
}

export function tenantLoginUrl(slug: string): string {
  if (typeof window === 'undefined') {
    return `http://${slug}.localhost:3000/login`;
  }
  const { protocol, port } = window.location;
  const portSuffix = port ? `:${port}` : '';
  return `${protocol}//${slug}.localhost${portSuffix}/login`;
}

export function platformLoginUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000/login';
  }
  const { protocol, port } = window.location;
  const portSuffix = port ? `:${port}` : '';
  return `${protocol}//localhost${portSuffix}/login`;
}

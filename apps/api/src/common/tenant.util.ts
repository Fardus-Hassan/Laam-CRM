import type { Request } from 'express';

function normalizeDomain(raw?: string | null): string | null {
  const value = (raw ?? '').trim().toLowerCase().replace(/^www\./, '');
  if (!value || value === 'localhost' || value === '127.0.0.1') {
    return null;
  }
  return value;
}

/** Apex hostname for the SaaS platform. Test/prod: set PLATFORM_DOMAIN (or WEB_URL). */
export function getPlatformDomain(): string | null {
  const fromEnv = normalizeDomain(process.env['PLATFORM_DOMAIN']);
  if (fromEnv) {
    return fromEnv;
  }
  const webUrl = process.env['WEB_URL'];
  if (webUrl) {
    try {
      return normalizeDomain(new URL(webUrl).hostname);
    } catch {
      return null;
    }
  }
  return null;
}

function platformHosts(): Set<string> {
  const hosts = new Set(['localhost', '127.0.0.1']);
  const domain = getPlatformDomain();
  if (domain) {
    hosts.add(domain);
    hosts.add(`www.${domain}`);
  } else {
    hosts.add('laamcrm.com');
    hosts.add('www.laamcrm.com');
  }
  return hosts;
}

export function isPlatformCorsHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost')) {
    return true;
  }
  const domain = getPlatformDomain() ?? 'laamcrm.com';
  if (h === domain || h === `www.${domain}` || h.endsWith(`.${domain}`)) {
    return true;
  }
  const extra = (process.env['CORS_ORIGINS'] ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return extra.some((item) => {
    if (item === h) {
      return true;
    }
    try {
      return new URL(item).hostname.toLowerCase() === h;
    } catch {
      return false;
    }
  });
}

export function resolveTenantSlugFromRequest(req: Request): string | null {
  const header = req.headers['x-tenant-slug'];
  if (typeof header === 'string' && header.trim()) {
    return header.trim().toLowerCase();
  }

  const host = (req.headers.host ?? '').split(':')[0]?.toLowerCase() ?? '';
  if (!host || platformHosts().has(host)) {
    return null;
  }

  if (host.endsWith('.localhost')) {
    const slug = host.replace(/\.localhost$/, '');
    return slug || null;
  }

  const domain = getPlatformDomain();
  if (domain && host.endsWith(`.${domain}`)) {
    const slug = host.slice(0, -(domain.length + 1));
    return slug.split('.')[0] || null;
  }

  const parts = host.split('.');
  if (parts.length >= 3) {
    return parts[0] || null;
  }

  return null;
}

export function isEmailMockMode(): boolean {
  return (process.env['EMAIL_MODE'] ?? 'mock') === 'mock';
}

export function isEmailSmtpMode(): boolean {
  return (process.env['EMAIL_MODE'] ?? 'mock') === 'smtp';
}

export function tenantWebUrl(slug: string): string {
  const base = process.env['WEB_URL'] ?? 'http://localhost:3000';
  try {
    const url = new URL(base);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return `${url.protocol}//${slug}.localhost:${url.port || '3000'}`;
    }
    const domain = getPlatformDomain() ?? url.hostname.replace(/^www\./, '');
    return `${url.protocol}//${slug}.${domain}`;
  } catch {
    return `http://${slug}.localhost:3000`;
  }
}

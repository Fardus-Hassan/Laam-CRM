import type { Request } from 'express';

const PLATFORM_HOSTS = new Set(['localhost', '127.0.0.1', 'laamcrm.com', 'www.laamcrm.com']);

export function resolveTenantSlugFromRequest(req: Request): string | null {
  const header = req.headers['x-tenant-slug'];
  if (typeof header === 'string' && header.trim()) {
    return header.trim().toLowerCase();
  }

  const host = (req.headers.host ?? '').split(':')[0]?.toLowerCase() ?? '';
  if (!host || PLATFORM_HOSTS.has(host)) {
    return null;
  }

  if (host.endsWith('.localhost')) {
    const slug = host.replace(/\.localhost$/, '');
    return slug || null;
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
    return `${url.protocol}//${slug}.laamcrm.com`;
  } catch {
    return `http://${slug}.localhost:3000`;
  }
}

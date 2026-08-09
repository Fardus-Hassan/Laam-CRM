import { env } from '@/config/env';
import { ApiError } from '@/lib/api/errors';
import { getStoredAccessToken, setStoredAccessToken } from '@/lib/auth-token';
import { getTenantSlugFromHost } from '@/lib/tenant';

export type ApiRequestOptions = RequestInit & {
  /** Skip JSON Content-Type for FormData uploads. */
  json?: boolean;
};

type TokenGetter = () => string | null | Promise<string | null>;
type SessionInvalidationHandler = (reason: {
  status: number;
  code?: string;
  message: string;
}) => void;

/** Default to localStorage so session bootstrap never races the AuthProvider effect. */
let getAccessToken: TokenGetter = () => getStoredAccessToken();
let onSessionInvalidated: SessionInvalidationHandler | null = null;

/** Wire this from auth once JWT/session cookies are implemented. */
export function setAccessTokenGetter(getter: TokenGetter) {
  getAccessToken = getter;
}

/** Called when API rejects the session (suspended/deleted org, expired token, etc.). */
export function setSessionInvalidationHandler(handler: SessionInvalidationHandler | null) {
  onSessionInvalidated = handler;
}

function readErrorCode(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }
  const record = body as Record<string, unknown>;
  if (typeof record.code === 'string') {
    return record.code;
  }
  if (record.message && typeof record.message === 'object') {
    const nested = record.message as Record<string, unknown>;
    if (typeof nested.code === 'string') {
      return nested.code;
    }
  }
  return undefined;
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') {
    return fallback;
  }
  const record = body as Record<string, unknown>;
  if (typeof record.message === 'string') {
    return record.message;
  }
  if (record.message && typeof record.message === 'object') {
    const nested = record.message as Record<string, unknown>;
    if (typeof nested.message === 'string') {
      return nested.message;
    }
  }
  return fallback;
}

async function buildHeaders(
  options: ApiRequestOptions,
): Promise<HeadersInit> {
  const headers = new Headers(options.headers);
  const useJson = options.json !== false;

  if (useJson && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = await getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const tenantSlug = getTenantSlugFromHost();
  if (tenantSlug) {
    headers.set('X-Tenant-Slug', tenantSlug);
  }

  return headers;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { json: _json, ...fetchOptions } = options;
  const hadToken = Boolean(await getAccessToken());
  const response = await fetch(`${env.apiUrl}${path}`, {
    ...fetchOptions,
    headers: await buildHeaders(options),
    credentials: 'include',
  });

  if (!response.ok) {
    let body: unknown;

    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    const code = readErrorCode(body);
    const message = readErrorMessage(
      body,
      `API request failed: ${response.status} ${response.statusText}`,
    );

    if (response.status === 401 && hadToken) {
      setStoredAccessToken(null);
      const isAuthProbe =
        path.includes('/auth/session') ||
        path.includes('/auth/login') ||
        path.includes('/auth/logout');
      if (!isAuthProbe) {
        onSessionInvalidated?.({ status: response.status, code, message });
      }
    }

    throw new ApiError(response.status, message, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

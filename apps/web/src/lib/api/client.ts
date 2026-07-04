import { env } from '@/config/env';
import { ApiError } from '@/lib/api/errors';

export type ApiRequestOptions = RequestInit & {
  /** Skip JSON Content-Type for FormData uploads. */
  json?: boolean;
};

type TokenGetter = () => string | null | Promise<string | null>;

let getAccessToken: TokenGetter = () => null;

/** Wire this from auth once JWT/session cookies are implemented. */
export function setAccessTokenGetter(getter: TokenGetter) {
  getAccessToken = getter;
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

  return headers;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { json: _json, ...fetchOptions } = options;
  const response = await fetch(`${env.apiUrl}${path}`, {
    ...fetchOptions,
    headers: await buildHeaders(options),
  });

  if (!response.ok) {
    let body: unknown;

    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    throw new ApiError(
      response.status,
      `API request failed: ${response.status} ${response.statusText}`,
      body,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

const TOKEN_KEY = 'laam_access_token';
const SESSION_COOKIE = 'laam_has_session';
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

function writeSessionCookie(hasSession: boolean) {
  if (typeof document === 'undefined') {
    return;
  }
  // Host-only cookie (works on laam.localhost and localhost).
  const base = `${SESSION_COOKIE}=${hasSession ? '1' : ''}; Path=/; SameSite=Lax`;
  document.cookie = hasSession
    ? `${base}; Max-Age=${SESSION_MAX_AGE_SEC}`
    : `${base}; Max-Age=0`;
}

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function hasStoredAccessToken(): boolean {
  return Boolean(getStoredAccessToken());
}

/** Keep session hint cookie in sync with localStorage JWT. */
export function syncSessionCookieFromStorage() {
  writeSessionCookie(hasStoredAccessToken());
}

export function setStoredAccessToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    writeSessionCookie(false);
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
  writeSessionCookie(true);
}

/**
 * Full document navigation after auth — avoids App Router soft-nav races
 * and guarantees the next page boots with token + cookie already written.
 */
export function navigateAfterAuth(path: string) {
  syncSessionCookieFromStorage();
  if (typeof window === 'undefined') {
    return;
  }
  window.location.assign(path);
}

export { SESSION_COOKIE };

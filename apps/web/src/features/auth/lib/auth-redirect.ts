/**
 * Safe post-login redirect targets (same-origin relative paths only).
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) {
    return null;
  }
  const trimmed = next.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }
  if (trimmed.startsWith('/login')) {
    return null;
  }
  return trimmed;
}

export function defaultPostLoginPath(role: string | undefined): string {
  return role === 'super_admin' ? '/dashboard/platform' : '/dashboard';
}

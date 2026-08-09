const STORAGE_KEY = 'laam_device_id';

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Stable browser device id for trusted-device OTP on login. */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const id = createId();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}

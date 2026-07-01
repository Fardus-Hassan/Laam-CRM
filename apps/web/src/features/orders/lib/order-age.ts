const SLA_HOURS_WARNING = 48;
const SLA_HOURS_CRITICAL = 72;

export type OrderAgeLevel = 'ok' | 'warning' | 'critical';

export function getOrderAgeHours(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, (Date.now() - created) / (1000 * 60 * 60));
}

export function getOrderAgeLevel(createdAt: string, status: string): OrderAgeLevel | null {
  if (!status.startsWith('pending') && status !== 'hold' && status !== 'hold_followup') {
    return null;
  }
  const hours = getOrderAgeHours(createdAt);
  if (hours >= SLA_HOURS_CRITICAL) return 'critical';
  if (hours >= SLA_HOURS_WARNING) return 'warning';
  return 'ok';
}

export function formatOrderAgeLabel(createdAt: string): string {
  const hours = getOrderAgeHours(createdAt);
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function isFollowUpDue(createdAt: string, status: string): boolean {
  const level = getOrderAgeLevel(createdAt, status);
  return level === 'warning' || level === 'critical';
}

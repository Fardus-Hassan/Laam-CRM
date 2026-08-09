import { formatDistanceToNowStrict, isYesterday, format } from 'date-fns';

/** Bell / feed style: "5m ago", "Yesterday 3:40 PM", else short date. */
export function formatNotificationTime(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;

    const ageMs = Date.now() - date.getTime();
    if (ageMs < 0) return format(date, 'MMM d, h:mm a');
    if (ageMs < 24 * 60 * 60 * 1000) {
      return `${formatDistanceToNowStrict(date, { addSuffix: true })}`;
    }
    if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    }
    if (ageMs < 7 * 24 * 60 * 60 * 1000) {
      return format(date, 'EEE h:mm a');
    }
    return format(date, 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

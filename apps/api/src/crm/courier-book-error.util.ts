import { HttpException } from '@nestjs/common';

/**
 * Human-readable courier book/submit errors for toasts + DB notes.
 * Never leak raw Prisma dumps to end users.
 */
export function formatCourierBookError(
  error: unknown,
  opts?: { maxLength?: number },
): string {
  const max = opts?.maxLength ?? 500;

  if (error instanceof HttpException) {
    const body = error.getResponse();
    if (typeof body === 'string' && body.trim()) {
      return body.trim().slice(0, max);
    }
    if (body && typeof body === 'object') {
      const msg = (body as { message?: string | string[] }).message;
      if (Array.isArray(msg) && msg.length) {
        return msg.map(String).join(', ').slice(0, max);
      }
      if (typeof msg === 'string' && msg.trim()) {
        return msg.trim().slice(0, max);
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    const m = error.message.trim();
    if (m.includes('prisma.') || m.includes('Invalid `')) {
      return 'Could not save courier submit status. Run prisma generate and restart the API.';
    }
    return m.slice(0, max);
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim().slice(0, max);
  }

  return 'Courier submit failed';
}

/** True when the failure is “already has a consignment” (not a submit miss). */
export function isAlreadyBookedCourierError(error: unknown): boolean {
  return formatCourierBookError(error).startsWith('Already booked');
}

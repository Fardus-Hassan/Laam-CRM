import { ApiError } from '@/lib/api/errors';

export function parseApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ApiError) {
    const body = error.body;
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message: unknown }).message;
      if (typeof message === 'string') {
        return message;
      }
      if (Array.isArray(message) && message.length > 0) {
        return String(message[0]);
      }
    }
    if (error.status === 404) {
      return 'No account found for this email on this company';
    }
    if (error.status === 403) {
      return 'This account cannot be used on this domain';
    }
    if (error.status === 429) {
      return 'Please wait before requesting another code';
    }
    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

import type { AuthUserPayload } from './decorators';

export type ActorLabel = { userId?: string; name?: string };

/** Display label: `Name (email)` — email-only or System when name missing. */
export function formatActorLabel(
  name?: string | null,
  email?: string | null,
): string {
  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim();
  if (trimmedName && trimmedEmail) {
    return `${trimmedName} (${trimmedEmail})`;
  }
  if (trimmedEmail) return trimmedEmail;
  if (trimmedName) return trimmedName;
  return 'System';
}

export function actorFromUser(user: AuthUserPayload): ActorLabel {
  return {
    userId: user.userId,
    name: formatActorLabel(user.name, user.email),
  };
}

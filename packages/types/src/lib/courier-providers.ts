import { z } from 'zod';

/**
 * Active courier integrations shown in UI / bulk actions / filters.
 * Add a provider here when its booking + settings are production-ready —
 * consumers should read from this list instead of hardcoding names.
 */
export const ACTIVE_COURIER_PROVIDERS = ['pathao', 'carrybee'] as const;

export type ActiveCourierProvider = (typeof ACTIVE_COURIER_PROVIDERS)[number];

export const activeCourierProviderSchema = z.enum(ACTIVE_COURIER_PROVIDERS);

export type CourierProviderMeta = {
  id: ActiveCourierProvider;
  label: string;
  /** Bulk action id used on order queues */
  submitBulkActionId: `submit_${ActiveCourierProvider}`;
  settingsHref: string;
};

export const COURIER_PROVIDER_META: Record<ActiveCourierProvider, CourierProviderMeta> = {
  pathao: {
    id: 'pathao',
    label: 'Pathao',
    submitBulkActionId: 'submit_pathao',
    settingsHref: '/dashboard/settings/integrations/pathao',
  },
  carrybee: {
    id: 'carrybee',
    label: 'Carrybee',
    submitBulkActionId: 'submit_carrybee',
    settingsHref: '/dashboard/settings/integrations/carrybee',
  },
};

export function listActiveCourierProviders(): CourierProviderMeta[] {
  return ACTIVE_COURIER_PROVIDERS.map((id) => COURIER_PROVIDER_META[id]);
}

export function isActiveCourierProvider(value: string): value is ActiveCourierProvider {
  return (ACTIVE_COURIER_PROVIDERS as readonly string[]).includes(value);
}

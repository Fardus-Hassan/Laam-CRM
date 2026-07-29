'use client';

import * as React from 'react';
import {
  COURIER_PROVIDER_META,
  listActiveCourierProviders,
  type ActiveCourierProvider,
  type CourierProviderMeta,
} from '@laam/types';

import { carrybeeSettingsApi } from '@/features/settings/api/carrybee-settings-api';
import { pathaoSettingsApi } from '@/features/settings/api/pathao-settings-api';

export type ConnectedCourier = CourierProviderMeta & {
  connected: true;
};

function isConnected(cfg: {
  enabled?: boolean;
  hasCredentials?: boolean;
  lastError?: string | null;
} | null): boolean {
  return Boolean(cfg?.enabled && cfg.hasCredentials && !cfg?.lastError);
}

/**
 * Returns only supported couriers that are connected for this org.
 * Unsupported / disconnected providers must not appear in operational UI.
 */
export function useConnectedCouriers() {
  const [connected, setConnected] = React.useState<ConnectedCourier[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (process.env.NEXT_PUBLIC_USE_API !== 'true') {
        // Mock / offline: treat all catalog providers as connected so UI stays usable.
        setConnected(
          listActiveCourierProviders().map((p) => ({ ...p, connected: true as const })),
        );
        return;
      }

      const supported = listActiveCourierProviders();
      const results = await Promise.all(
        supported.map(async (meta) => {
          try {
            if (meta.id === 'pathao') {
              const cfg = await pathaoSettingsApi.get();
              return isConnected(cfg) ? { ...meta, connected: true as const } : null;
            }
            if (meta.id === 'carrybee') {
              const cfg = await carrybeeSettingsApi.get();
              return isConnected(cfg) ? { ...meta, connected: true as const } : null;
            }
            return null;
          } catch {
            return null;
          }
        }),
      );
      setConnected(results.filter((r): r is ConnectedCourier => r != null));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load couriers');
      setConnected([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const connectedIds = React.useMemo(
    () => new Set(connected.map((c) => c.id)),
    [connected],
  );

  const isProviderConnected = React.useCallback(
    (id: string): id is ActiveCourierProvider =>
      connectedIds.has(id as ActiveCourierProvider),
    [connectedIds],
  );

  const submitBulkActionIds = React.useMemo(
    () => new Set(connected.map((c) => c.submitBulkActionId)),
    [connected],
  );

  return {
    connected,
    connectedIds,
    loading,
    error,
    refresh,
    isProviderConnected,
    submitBulkActionIds,
    /** Supported catalog (for settings connect UI only). */
    supported: listActiveCourierProviders(),
    meta: COURIER_PROVIDER_META,
  };
}

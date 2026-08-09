'use client';

import * as React from 'react';

import { rbacApi } from '@/features/rbac/api/rbac-api';
import { getAgentNames } from '@/features/rbac/data/agent-names';

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';

/**
 * Live org users for agent pickers when API mode is on; mock names otherwise.
 */
export function useAgentOptions(): { agents: string[]; isLoading: boolean } {
  const [agents, setAgents] = React.useState<string[]>(() =>
    useHttpApi ? [] : getAgentNames(),
  );
  const [isLoading, setIsLoading] = React.useState(useHttpApi);

  React.useEffect(() => {
    if (!useHttpApi) return;
    let cancelled = false;
    setIsLoading(true);
    void rbacApi
      .listUsers('')
      .then((users) => {
        if (cancelled) return;
        const names = users.map((u) => u.name).filter(Boolean);
        setAgents(names.length ? names : getAgentNames());
      })
      .catch(() => {
        if (!cancelled) setAgents(getAgentNames());
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { agents, isLoading };
}

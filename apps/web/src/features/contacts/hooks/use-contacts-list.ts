'use client';

import * as React from 'react';
import type { ContactListQuery, ContactListResponse } from '@laam/types';

import { contactsApi } from '@/features/contacts/api/contacts-api';

export function useContactsList(query: ContactListQuery, listVersion = 0) {
  const [data, setData] = React.useState<ContactListResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const queryKey = JSON.stringify(query);

  const fetchList = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await contactsApi.listContacts(query);
      setData(response);
    } catch {
      setError('Failed to load contacts.');
    } finally {
      setIsLoading(false);
    }
  }, [queryKey]);

  React.useEffect(() => {
    void fetchList();
  }, [fetchList, listVersion]);

  return { data, isLoading, error, refresh: fetchList };
}

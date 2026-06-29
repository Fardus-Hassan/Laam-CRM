'use client';

import * as React from 'react';
import type { ContactListQuery, ContactListResponse } from '@laam/types';

import { contactsApi } from '@/features/contacts/api/contacts-api';

export function useContactsList(query: ContactListQuery) {
  const [data, setData] = React.useState<ContactListResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const queryKey = JSON.stringify(query);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    void contactsApi.listContacts(query).then(
      (response) => {
        if (!cancelled) {
          setData(response);
          setIsLoading(false);
        }
      },
      () => {
        if (!cancelled) {
          setError('Failed to load contacts.');
          setIsLoading(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [queryKey]);

  return { data, isLoading, error };
}

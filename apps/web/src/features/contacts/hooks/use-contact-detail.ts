'use client';

import * as React from 'react';
import type { ContactDetail } from '@laam/types';

import { contactsApi } from '@/features/contacts/api/contacts-api';

export function useContactDetail(id: string) {
  const [data, setData] = React.useState<ContactDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    void contactsApi.getContact(id).then(
      (contact) => {
        if (!cancelled) {
          setData(contact);
          setIsLoading(false);
          if (!contact) setError('Contact not found.');
        }
      },
      () => {
        if (!cancelled) {
          setError('Failed to load contact.');
          setIsLoading(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { data, isLoading, error };
}

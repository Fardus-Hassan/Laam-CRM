'use client';

import type { ContactListQuery } from '@laam/types';

import { contactsApi } from '@/features/contacts/api/contacts-api';
import { contactListCache } from '@/features/contacts/data/contact-query-cache';
import { useTtlList } from '@/lib/use-ttl-list';

export function useContactsList(query: ContactListQuery, listVersion = 0) {
  return useTtlList({
    query,
    version: listVersion,
    cache: contactListCache,
    fetcher: (q) => contactsApi.listContacts(q),
    errorMessage: 'Failed to load contacts.',
  });
}

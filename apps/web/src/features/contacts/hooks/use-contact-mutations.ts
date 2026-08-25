'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { contactsApi } from '@/features/contacts/api/contacts-api';
import { invalidateContactQueryCaches } from '@/features/contacts/data/contact-query-cache';

export function useContactMutations() {
  const [isLoading, setIsLoading] = React.useState(false);

  async function createContact(payload: Parameters<typeof contactsApi.createContact>[0]) {
    setIsLoading(true);
    try {
      const contact = await contactsApi.createContact(payload);
      toast.success(`${contact.name} added to contacts`);
      invalidateContactQueryCaches();
      return contact;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create contact');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function updateContact(
    id: string,
    patch: Parameters<typeof contactsApi.updateContact>[1],
  ) {
    setIsLoading(true);
    try {
      const contact = await contactsApi.updateContact(id, patch);
      invalidateContactQueryCaches();
      return contact;
    } finally {
      setIsLoading(false);
    }
  }

  async function bulkAction(payload: Parameters<typeof contactsApi.bulkAction>[0]) {
    setIsLoading(true);
    try {
      const result = await contactsApi.bulkAction(payload);
      invalidateContactQueryCaches();
      return result;
    } finally {
      setIsLoading(false);
    }
  }

  return { createContact, updateContact, bulkAction, isLoading };
}

'use client';

import { ContactListShell } from '@/features/contacts/components/contact-list/contact-list-shell';

type ContactsListPageProps = {
  source?: string;
};

export function ContactsListPage({ source }: ContactsListPageProps) {
  return <ContactListShell source={source} />;
}

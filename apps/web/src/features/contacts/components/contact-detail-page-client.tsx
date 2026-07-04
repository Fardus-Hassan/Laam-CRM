'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { ContactDetailView } from '@/features/contacts/components/contact-detail-view';
import { useContactDetail } from '@/features/contacts/hooks/use-contact-detail';

export function ContactDetailPageClient({ contactId }: { contactId: string }) {
  const { data, isLoading, error } = useContactDetail(contactId);
  if (isLoading) return <div className="space-y-4 p-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (error || !data) return <p className="p-4 text-sm text-destructive">{error ?? 'Contact not found.'}</p>;
  return <ContactDetailView contact={data} />;
}

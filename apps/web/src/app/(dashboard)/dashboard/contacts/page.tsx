import { Suspense } from 'react';
import { ContactsListPage } from '@/features/contacts/components/contacts-list-page';
import { Skeleton } from '@/components/ui/skeleton';

type ContactsPageProps = {
  searchParams?: Promise<{ source?: string; search?: string }>;
};

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  return (
    <Suspense fallback={<div className="space-y-4 p-4"><Skeleton className="h-64 w-full" /></div>}>
      <ContactsListPage source={params?.source} />
    </Suspense>
  );
}

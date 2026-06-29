import { ContactDetailPageClient } from '@/features/contacts/components/contact-detail-page-client';

type ContactDetailPageProps = {
  params: Promise<{ contactId: string }>;
};

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { contactId } = await params;
  return <ContactDetailPageClient contactId={contactId} />;
}

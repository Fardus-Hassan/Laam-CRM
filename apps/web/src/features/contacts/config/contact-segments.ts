import type { ContactSegmentCount, ContactType } from '@laam/types';

export type ContactSegmentDefinition = {
  id: string;
  label: string;
  contactType?: ContactType;
  tag?: string;
};

export const CONTACT_SEGMENTS: ContactSegmentDefinition[] = [
  { id: 'all', label: 'All contacts' },
  { id: 'customer', label: 'Customers', contactType: 'customer' },
  { id: 'supplier', label: 'Suppliers', contactType: 'supplier' },
  { id: 'partner', label: 'Partners', contactType: 'partner' },
  { id: 'other', label: 'Other', contactType: 'other' },
  { id: 'has_followup', label: 'Follow-up due' },
];

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  customer: 'Customer',
  supplier: 'Supplier',
  partner: 'Partner',
  other: 'Other',
};

export type ContactSegmentCounts = ContactSegmentCount[];

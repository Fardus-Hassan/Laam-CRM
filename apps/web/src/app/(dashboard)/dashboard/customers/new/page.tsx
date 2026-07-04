'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormTextarea } from '@/components/form/form-textarea';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { upsertMockCustomerFromImport } from '@/features/customers/data/mock-customers';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
} from '@/features/orders/components/create-order/section-layout';

export default function CreateCustomerPage() {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [district, setDistrict] = React.useState('Dhaka');
  const [notes, setNotes] = React.useState('');

  function handleSave() {
    if (!name.trim() || phone.replace(/\D/g, '').length < 8) {
      toast.error('Name and valid phone are required');
      return;
    }
    const customer = upsertMockCustomerFromImport({
      name: name.trim(),
      phone,
      email: email || undefined,
      address: address || undefined,
      district,
      notes: notes || undefined,
    });
    toast.success(`Customer ${customer.name} saved`);
    router.push(`/dashboard/companies/${customer.id}`);
  }

  return (
    <PageShell title="New customer" description="Add a buyer — phone is the unique key.">
      <div className={ORDER_PAGE_GAP}>
        <Card className={ORDER_CARD_CLASS}>
          <CardContent className={`${ORDER_SECTION_BODY_CLASS} grid gap-4 sm:grid-cols-2`}>
            <FormField label="Name">
              <FormInput value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Phone">
              <FormInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="017XXXXXXXX" />
            </FormField>
            <FormField label="Email">
              <FormInput value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormField>
            <FormField label="District">
              <FormInput value={district} onChange={(e) => setDistrict(e.target.value)} />
            </FormField>
            <FormField label="Address" className="sm:col-span-2">
              <FormInput value={address} onChange={(e) => setAddress(e.target.value)} />
            </FormField>
            <FormField label="Notes" className="sm:col-span-2">
              <FormTextarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </FormField>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button type="button" onClick={handleSave}>Save customer</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </div>
    </PageShell>
  );
}

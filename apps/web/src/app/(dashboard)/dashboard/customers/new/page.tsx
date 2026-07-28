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
import { customersApi } from '@/features/customers/api/customers-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
} from '@/features/orders/components/create-order/section-layout';

export default function CreateCustomerPage() {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [district, setDistrict] = React.useState('Dhaka');
  const [notes, setNotes] = React.useState('');

  async function handleSave() {
    if (!name.trim() || phone.replace(/\D/g, '').length < 8) {
      toast.error('Name and valid phone are required');
      return;
    }
    setSaving(true);
    try {
      const customer = await customersApi.createCustomer({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        district: district.trim() || undefined,
        notes: notes.trim() || undefined,
        source: 'manual',
      });
      toast.success(`Customer ${customer.name} saved`);
      router.push(`/dashboard/customers/${customer.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save customer');
    } finally {
      setSaving(false);
    }
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
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save customer'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </PageShell>
  );
}

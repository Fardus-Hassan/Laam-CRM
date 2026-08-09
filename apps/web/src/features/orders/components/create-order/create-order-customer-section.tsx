'use client';

import * as React from 'react';
import type { OrderSource } from '@laam/types';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormPhoneInput } from '@/components/form/form-phone-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { FormSelect } from '@/components/form/form-select';
import { FormTextarea } from '@/components/form/form-textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useConnectedCouriers } from '@/features/courier/hooks/use-connected-couriers';
import type { CreateOrderFormApi } from '@/features/orders/hooks/use-create-order-form';
import { cn } from '@/lib/utils';

import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_GRID_GAP,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { CourierLocationDialog } from './courier-location-dialog';

type CreateOrderCustomerSectionProps = {
  form: CreateOrderFormApi;
};

function phoneDigits(phone?: string | null): string {
  return (phone ?? '').replace(/\D/g, '');
}

export function CreateOrderCustomerSection({ form }: CreateOrderCustomerSectionProps) {
  const {
    state,
    errors,
    options,
    patch,
    lookupCustomer,
    setPathaoLocation,
    setCarrybeeLocation,
    clearFieldError,
  } = form;
  const [locationOpen, setLocationOpen] = React.useState(false);
  const { connected, isProviderConnected, loading: couriersLoading } = useConnectedCouriers();
  const showPathao = isProviderConnected('pathao');
  const showCarrybee = isProviderConnected('carrybee');
  const hasCourierPicker = showPathao || showCarrybee;
  const locationProviders = React.useMemo(
    () =>
      connected
        .map((c) => c.id)
        .filter((id): id is 'pathao' | 'carrybee' => id === 'pathao' || id === 'carrybee'),
    [connected],
  );

  const districtOptions = React.useMemo(() => {
    const q = state.district.trim().toLowerCase();
    const list = options.districts.filter((d) => !q || d.label.toLowerCase().includes(q));
    return (list.length ? list : options.districts).map((d) => ({
      value: d.value,
      label: d.label,
    }));
  }, [options.districts, state.district]);

  const orderSourceOptions = options.sources;
  const orderTagOptions = options.orderTags;

  const locationHint = state.address.trim()
    ? 'Address ready for courier booking. Pick location again to replace, or edit manually.'
    : connected.length
      ? 'Pick location to fill address, or type the full address (Pathao & Carrybee both book from address).'
      : couriersLoading
        ? 'Loading location sources…'
        : 'Type the full delivery address, or connect Pathao/Carrybee in Settings to use location picker.';

  // Auto-load shop order stats when phone is valid (create + detail) — no blur required.
  React.useEffect(() => {
    if (phoneDigits(state.mobile).length < 10) return;
    const handle = window.setTimeout(() => {
      void lookupCustomer(state.mobile);
    }, 280);
    return () => window.clearTimeout(handle);
  }, [state.mobile, lookupCustomer]);

  return (
    <>
      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">Customer Information</CardTitle>
        </CardHeader>
        <CardContent className={cn('grid', ORDER_SECTION_BODY_CLASS, ORDER_SECTION_GRID_GAP)}>
          <div
            className={cn(
              'col-span-full grid sm:grid-cols-2 lg:grid-cols-4',
              ORDER_SECTION_GRID_GAP,
            )}
          >
            <FormField label="Mobile Number" htmlFor="mobile" required error={errors.mobile}>
              <FormPhoneInput
                id="mobile"
                value={state.mobile}
                onChange={(event) => {
                  patch({ mobile: event.target.value, customerStats: null });
                  clearFieldError('mobile');
                }}
                onBlur={() => void lookupCustomer()}
                placeholder="01XXXXXXXXX"
                className={cn(errors.mobile && 'border-destructive')}
              />
            </FormField>

            <FormField label="Alternative Number" htmlFor="altMobile">
              <FormInput
                id="altMobile"
                value={state.altMobile}
                onChange={(event) => patch({ altMobile: event.target.value })}
                placeholder="01XXXXXXXXX"
              />
            </FormField>

            <FormField label="Name" htmlFor="name" required error={errors.name}>
              <FormInput
                id="name"
                value={state.name}
                onChange={(event) => {
                  patch({ name: event.target.value });
                  clearFieldError('name');
                }}
                className={cn(errors.name && 'border-destructive')}
              />
            </FormField>

            <FormField label="Email" htmlFor="email">
              <FormInput
                id="email"
                type="email"
                value={state.email}
                onChange={(event) => patch({ email: event.target.value })}
              />
            </FormField>
          </div>

          <div className={cn('col-span-full grid lg:grid-cols-2', ORDER_SECTION_GRID_GAP)}>
            <FormField
              label="Address"
              htmlFor="address"
              required
              error={errors.address}
              className="min-w-0"
              labelAction={
                hasCourierPicker ? (
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {state.address.trim() ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          patch({ address: '' });
                          setPathaoLocation(null);
                          setCarrybeeLocation(null);
                        }}
                      >
                        Clear
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setLocationOpen(true)}
                    >
                      {state.address.trim() ? 'Change location' : 'Pick location'}
                    </Button>
                  </div>
                ) : null
              }
              hint={locationHint}
            >
              <FormTextarea
                id="address"
                rows={3}
                value={state.address}
                placeholder="Full delivery address"
                onChange={(event) => {
                  patch({ address: event.target.value });
                  clearFieldError('address');
                }}
                className={cn(
                  'min-h-[4.5rem] w-full break-words',
                  errors.address && 'border-destructive',
                )}
              />
            </FormField>

            <FormField label="Customer Note" htmlFor="customerNote">
              <FormTextarea
                id="customerNote"
                rows={3}
                value={state.customerNote}
                onChange={(event) => patch({ customerNote: event.target.value })}
                placeholder="Customer preferences, allergies, delivery instructions…"
              />
            </FormField>
          </div>

          <div
            className={cn(
              'col-span-full grid sm:grid-cols-2 lg:grid-cols-4',
              ORDER_SECTION_GRID_GAP,
            )}
          >
            <FormField label="District">
              <FormSearchSelect
                value={state.district}
                onChange={(district) => patch({ district })}
                options={districtOptions}
                placeholder="Search District"
                searchPlaceholder="Search District"
              />
            </FormField>

            <FormField label="Order Source" htmlFor="orderSource" error={errors.orderSource}>
              <FormSelect
                id="orderSource"
                value={state.orderSource}
                onChange={(orderSource) => {
                  patch({ orderSource: orderSource as OrderSource | '' });
                  clearFieldError('orderSource');
                }}
                options={orderSourceOptions}
                placeholder="Select source"
              />
            </FormField>

            <FormField label="Order Tag" htmlFor="orderTag">
              <FormSelect
                id="orderTag"
                value={state.orderTag}
                onChange={(orderTag) => patch({ orderTag })}
                options={orderTagOptions}
                placeholder="Select tag"
              />
            </FormField>

            <FormField label="Customer Tag" htmlFor="customerTag">
              <FormInput
                id="customerTag"
                value={state.customerTag}
                onChange={(event) => patch({ customerTag: event.target.value })}
                placeholder="e.g. VIP, Repeat buyer"
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {hasCourierPicker ? (
        <CourierLocationDialog
          open={locationOpen}
          onOpenChange={setLocationOpen}
          providers={locationProviders}
          pathaoValue={state.pathaoLocation}
          carrybeeValue={state.carrybeeLocation}
          preferredProvider={
            state.carrybeeLocation ? 'carrybee' : state.pathaoLocation ? 'pathao' : null
          }
          onConfirm={(result) => {
            // Global location picker: fill address only — no courier IDs stored.
            // Pathao & Carrybee both book from the typed/filled shipping address.
            const loc = result.location;
            patch({
              address: loc.label,
              district: loc.city || state.district,
            });
            setPathaoLocation(null);
            setCarrybeeLocation(null);
            toast.success('Location applied to address');
            clearFieldError('address');
          }}
        />
      ) : null}
    </>
  );
}

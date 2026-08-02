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
import { CourierPhoneHistoryPanel } from '@/features/courier/components/courier-phone-history-panel';
import type { CreateOrderFormApi } from '@/features/orders/hooks/use-create-order-form';
import { cn } from '@/lib/utils';

import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_GRID_GAP,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { CarrybeeLocationDialog } from './carrybee-location-dialog';
import { PathaoLocationDialog } from './pathao-location-dialog';

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
  const [pathaoOpen, setPathaoOpen] = React.useState(false);
  const [carrybeeOpen, setCarrybeeOpen] = React.useState(false);
  const { connected, isProviderConnected, loading: couriersLoading } = useConnectedCouriers();
  const showPathao = isProviderConnected('pathao');
  const showCarrybee = isProviderConnected('carrybee');

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

  const locationHint = state.carrybeeLocation
    ? `Carrybee: ${state.carrybeeLocation.label}`
    : state.pathaoLocation
      ? `Pathao: ${state.pathaoLocation.label}`
      : connected.length
        ? `Select ${connected.map((c) => c.label).join(' or ')} location to auto-fill delivery address.`
        : couriersLoading
          ? 'Loading courier integrations…'
          : 'No courier connected — set address manually, or connect Pathao/Carrybee in Settings → Integrations.';

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
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  {(state.pathaoLocation || state.carrybeeLocation) &&
                  (showPathao || showCarrybee) ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        setPathaoLocation(null);
                        setCarrybeeLocation(null);
                      }}
                    >
                      Clear
                    </Button>
                  ) : null}
                  {showPathao ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setPathaoOpen(true)}
                    >
                      {state.pathaoLocation ? 'Change Pathao' : 'Pathao'}
                    </Button>
                  ) : null}
                  {showCarrybee ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setCarrybeeOpen(true)}
                    >
                      {state.carrybeeLocation ? 'Change Carrybee' : 'Carrybee'}
                    </Button>
                  ) : null}
                </div>
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

          {phoneDigits(state.mobile).length >= 10 ? (
            <div className="col-span-full space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="w-full text-xs font-medium text-muted-foreground">
                  This shop (CRM)
                </p>
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Total Orders: </span>
                  <span className="font-semibold">
                    {state.customerStats?.totalOrders ?? 0}
                  </span>
                </div>
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Completed/Delivered: </span>
                  <span className="font-semibold">
                    {state.customerStats?.completedDelivered ?? 0}
                  </span>
                </div>
              </div>
              <CourierPhoneHistoryPanel phone={state.mobile} compact />
            </div>
          ) : null}

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

      {showPathao ? (
        <PathaoLocationDialog
          open={pathaoOpen}
          onOpenChange={setPathaoOpen}
          value={state.pathaoLocation}
          onConfirm={(location) => {
            setCarrybeeLocation(null);
            setPathaoLocation(location);
            clearFieldError('address');
            toast.success('Pathao location applied to address');
          }}
        />
      ) : null}
      {showCarrybee ? (
        <CarrybeeLocationDialog
          open={carrybeeOpen}
          onOpenChange={setCarrybeeOpen}
          value={state.carrybeeLocation}
          onConfirm={(location) => {
            setPathaoLocation(null);
            setCarrybeeLocation(location);
            clearFieldError('address');
            toast.success('Carrybee location applied to address');
          }}
        />
      ) : null}
    </>
  );
}

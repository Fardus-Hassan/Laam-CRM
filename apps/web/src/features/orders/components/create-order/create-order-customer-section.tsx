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
import {
  MOCK_ORDER_TAGS,
  searchDistricts,
} from '@/features/orders/data/mock-create-order';
import { ORDER_SOURCE_LABELS } from '@/features/orders/config/order-status';
import type { CreateOrderFormApi } from '@/features/orders/hooks/use-create-order-form';
import { cn } from '@/lib/utils';

import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_GRID_GAP,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { PathaoLocationDialog } from './pathao-location-dialog';

type CreateOrderCustomerSectionProps = {
  form: CreateOrderFormApi;
};

export function CreateOrderCustomerSection({ form }: CreateOrderCustomerSectionProps) {
  const { state, errors, patch, lookupCustomer, setPathaoLocation, clearFieldError } = form;
  const [pathaoOpen, setPathaoOpen] = React.useState(false);

  const districtOptions = React.useMemo(
    () =>
      searchDistricts(state.district).map((district) => ({
        value: district,
        label: district,
      })),
    [state.district],
  );

  const orderSourceOptions = (Object.keys(ORDER_SOURCE_LABELS) as OrderSource[]).map(
    (source) => ({
      value: source,
      label: ORDER_SOURCE_LABELS[source],
    }),
  );

  const orderTagOptions = MOCK_ORDER_TAGS.map((tag) => ({ value: tag, label: tag }));

  function handleMobileBlur() {
    lookupCustomer();
  }

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
            <FormField
              label="Mobile Number"
              htmlFor="mobile"
              required
              error={errors.mobile}
            >
              <FormPhoneInput
                id="mobile"
                value={state.mobile}
                onChange={(event) => {
                  patch({ mobile: event.target.value });
                  clearFieldError('mobile');
                }}
                onBlur={handleMobileBlur}
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

          <FormField
            label="Address"
            htmlFor="address"
            required
            error={errors.address}
            className="col-span-full"
            labelAction={
              <div className="flex items-center gap-1.5">
                {state.pathaoLocation ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => setPathaoLocation(null)}
                  >
                    Clear
                  </Button>
                ) : null}
                <Button type="button" size="sm" className="h-7 text-xs" onClick={() => setPathaoOpen(true)}>
                  {state.pathaoLocation ? 'Change Pathao' : 'Select Pathao Location'}
                </Button>
              </div>
            }
            hint={
              state.pathaoLocation
                ? state.pathaoLocation.label
                : 'Use Pathao location to auto-fill delivery address.'
            }
          >
            <FormTextarea
              id="address"
              rows={3}
              value={state.address}
              readOnly={Boolean(state.pathaoLocation)}
              onChange={(event) => {
                patch({ address: event.target.value });
                clearFieldError('address');
              }}
              className={cn(
                errors.address && 'border-destructive',
                state.pathaoLocation && 'bg-muted/40',
              )}
            />
          </FormField>

          {state.customerStats ? (
            <div className="col-span-full flex flex-wrap items-center gap-2">
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Total Orders: </span>
                <span className="font-semibold">{state.customerStats.totalOrders}</span>
              </div>
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Completed/Delivered: </span>
                <span className="font-semibold">{state.customerStats.completedDelivered}</span>
              </div>
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

            <FormField label="Order Source" htmlFor="orderSource">
              <FormSelect
                id="orderSource"
                value={state.orderSource}
                onChange={(orderSource) => patch({ orderSource: orderSource as OrderSource | '' })}
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

      <PathaoLocationDialog
        open={pathaoOpen}
        onOpenChange={setPathaoOpen}
        value={state.pathaoLocation}
        onConfirm={(location) => {
          setPathaoLocation(location);
          clearFieldError('address');
          toast.success('Delivery location applied to address');
        }}
      />
    </>
  );
}

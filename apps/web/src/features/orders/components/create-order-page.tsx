'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const inputClassName =
  'flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const DEFAULT_COURIER_NOTE =
  'পার্সেল খোলা যাবে না — মার্চেন্টকে জানানো ছাড়া খুলবেন না।';

export function CreateOrderPage() {
  const router = useRouter();
  const [skipFollowup, setSkipFollowup] = React.useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    router.push('/dashboard/orders?status=pending');
  }

  return (
    <PageShell
      title="Create New Order"
      description="Manually enter customer, products, and payment details."
    >
      <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-sm">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="mobile">Mobile Number *</Label>
                <Input id="mobile" placeholder="01XXXXXXXXX" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="altMobile">Alternative Number</Label>
                <Input id="altMobile" placeholder="01XXXXXXXXX" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Address *</Label>
                <textarea id="address" required rows={3} className={inputClassName} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="district">District</Label>
                <Input id="district" placeholder="Search District" />
              </div>
              <div className="space-y-1.5">
                <Label>Pathao Location</Label>
                <Button type="button" variant="outline" size="sm">
                  Select Pathao Location
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-sm">Listed Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="product">Select Product</Label>
                <Input id="product" placeholder="Search Product" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="orderStatus">Order Status *</Label>
                  <Input id="orderStatus" defaultValue="Pending" readOnly />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="paymentMethod">Payment Method *</Label>
                  <Input id="paymentMethod" defaultValue="Cash on Delivery" readOnly />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="courierNote">Courier Note</Label>
                <textarea id="courierNote" defaultValue={DEFAULT_COURIER_NOTE} rows={3} className={inputClassName} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="packingNote">Packing Note</Label>
                <textarea id="packingNote" rows={2} className={inputClassName} />
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-sm">Other Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="utmSource">UTM Source</Label>
                <Input id="utmSource" placeholder="e.g. fb" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="utmCampaign">UTM Campaign</Label>
                <Input id="utmCampaign" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>0.00 Tk</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>0.00 Tk</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Grand Total</span>
              <span>0.00 Tk</span>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                id="skipFollowup"
                type="checkbox"
                checked={skipFollowup}
                onChange={(event) => setSkipFollowup(event.target.checked)}
                className="size-4 rounded border border-input"
              />
              <Label htmlFor="skipFollowup">Skip Followup</Label>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit">Submit</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/orders">Cancel</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">NB: * marked are required field.</p>
          </CardContent>
        </Card>
      </form>
    </PageShell>
  );
}

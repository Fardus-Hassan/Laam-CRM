'use client';

import Link from 'next/link';
import type { OrderDetail } from '@laam/types';
import {
  Building2,
  Package,
  Ticket,
  TrendingUp,
  Truck,
  Wallet,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_CARD_CLASS,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

type OrderRelatedLinksProps = {
  order: OrderDetail;
};

export function OrderRelatedLinks({ order }: OrderRelatedLinksProps) {
  const links = [
    {
      href: `/dashboard/companies?search=${encodeURIComponent(order.customerPhone)}`,
      icon: Building2,
      label: 'Customer profile',
      hint: order.customerName,
    },
    {
      href: '/dashboard/inventory/products',
      icon: Package,
      label: 'Product stock',
      hint: `${order.lineItems?.length ?? 0} line items`,
    },
    {
      href: '/dashboard/courier',
      icon: Truck,
      label: 'Courier hub',
      hint: 'Submit & track',
    },
    {
      href: '/dashboard/accounting/income',
      icon: Wallet,
      label: 'Record income',
      hint: order.status === 'delivered' || order.status === 'completed' ? 'Payment received' : 'When paid',
    },
    {
      href: `/dashboard/support`,
      icon: Ticket,
      label: 'Support ticket',
      hint: order.orderNumber,
    },
    {
      href: '/dashboard/accounting/receivables',
      icon: TrendingUp,
      label: 'Receivables',
      hint: 'Outstanding COD',
    },
  ];

  return (
    <Card className={ORDER_CARD_CLASS}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">Related</CardTitle>
      </CardHeader>
      <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-1')}>
        {links.map((link) => (
          <Link
            key={link.href + link.label}
            href={link.href}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <link.icon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="font-medium">{link.label}</p>
              <p className="truncate text-xs text-muted-foreground">{link.hint}</p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

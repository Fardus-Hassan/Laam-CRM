'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';

type LinkedLeadCardProps = {
  leadId: string;
};

export function LinkedLeadCard({ leadId }: LinkedLeadCardProps) {
  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">Converted from lead</CardTitle>
      </CardHeader>
      <CardContent className={ORDER_SECTION_BODY_CLASS}>
        <p className="mb-3 text-sm text-muted-foreground">Lead ID: {leadId}</p>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href={`/dashboard/leads/${leadId}`}>
            <ExternalLink className="size-4" />
            View lead
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

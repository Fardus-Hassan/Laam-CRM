'use client';

import * as React from 'react';
import Link from 'next/link';
import { MessageSquare, Settings2 } from 'lucide-react';

import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

/**
 * Production automations live under Settings → SMS (status → template map).
 * This page explains that and deep-links — no mock rule editor.
 */
export function AutomationsPage() {
  return (
    <PageShell
      title="Automations"
      description="Order-driven automations that run in production."
    >
      <div className={ORDER_PAGE_GAP}>
        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="size-4 text-primary" />
              Auto SMS on status change
            </CardTitle>
          </CardHeader>
          <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
            <p className="text-sm text-muted-foreground">
              When an order status changes (for example Confirmed or Delivered), the system can
              automatically send an SMS from your mapped template. Configure the toggle and
              status → template map in SMS settings — that is the live production path.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" asChild>
                <Link href="/dashboard/settings/integrations/sms">
                  <Settings2 className="size-4" />
                  Open SMS automation settings
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

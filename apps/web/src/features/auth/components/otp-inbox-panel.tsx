'use client';

import * as React from 'react';
import { OTP_PURPOSE_LABELS, type OtpInboxItem } from '@laam/types';
import { Inbox, RefreshCw, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { DataTableCopyableText } from '@/components/data-table/cells/copyable-cell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { otpInboxApi } from '@/features/auth/api/otp-inbox-api';
import { OtpCountdown } from '@/features/auth/components/otp-countdown';
import { parseApiErrorMessage } from '@/lib/api/parse-api-error';

function formatPurpose(purpose: OtpInboxItem['purpose']) {
  return OTP_PURPOSE_LABELS[purpose] ?? purpose;
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}

export function OtpInboxPanel() {
  const [items, setItems] = React.useState<OtpInboxItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const next = await otpInboxApi.list();
      setItems(next);
    } catch (error) {
      toast.error(parseApiErrorMessage(error, 'Could not load OTP inbox'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Inbox className="size-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm">Staff OTP inbox</CardTitle>
            <p className="text-xs text-muted-foreground">
              Relay codes for team members who don&apos;t receive email OTPs.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => void load(true)}
        >
          <RefreshCw className={refreshing ? 'size-3.5 animate-spin' : 'size-3.5'} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading inbox…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Shield className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No active OTP requests</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              When a team member resets a password, changes password, or signs in from a new
              device, their code will appear here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.userName ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{item.email}</div>
                  </TableCell>
                  <TableCell className="text-sm">{formatPurpose(item.purpose)}</TableCell>
                  <TableCell>
                    {item.relayCode ? (
                      <DataTableCopyableText
                        value={item.relayCode}
                        copyToastMessage="OTP copied"
                        className="font-mono text-base font-semibold tracking-widest"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">Consumed</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{formatWhen(item.expiresAt)}</div>
                    <OtpCountdown
                      expiresAt={item.expiresAt}
                      resendAfter={item.resendAfter}
                      className="mt-1 text-xs"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

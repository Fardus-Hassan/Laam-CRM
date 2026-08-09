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
import { openNotificationUnreadStream } from '@/features/notifications/lib/notification-unread-stream';
import { parseApiErrorMessage } from '@/lib/api/parse-api-error';
import { formatDateTime } from '@/lib/format';

/** Backup poll; primary refresh is via notification SSE when a new OTP lands. */
const INBOX_BACKUP_POLL_MS = 30_000;

function formatPurpose(purpose: OtpInboxItem['purpose']) {
  return OTP_PURPOSE_LABELS[purpose] ?? purpose;
}

function formatWhen(iso: string) {
  return formatDateTime(iso);
}

export function OtpInboxPanel() {
  const [items, setItems] = React.useState<OtpInboxItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const lastUnreadRef = React.useRef<number | null>(null);

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
      if (!silent) {
        toast.error(parseApiErrorMessage(error, 'Could not load OTP inbox'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const ac = new AbortController();
    let retryTimer = 0;
    let attempt = 0;

    async function connect() {
      try {
        attempt = 0;
        await openNotificationUnreadStream({
          signal: ac.signal,
          onUnread: (count) => {
            const prev = lastUnreadRef.current;
            lastUnreadRef.current = count;
            // New unread (OTP notify) → refresh inbox immediately.
            if (prev !== null && count > prev) {
              void load(true);
            }
          },
        });
      } catch {
        // reconnect below
      }
      if (ac.signal.aborted) return;
      attempt += 1;
      const delay = Math.min(30_000, 1500 * 2 ** Math.min(attempt, 4));
      retryTimer = window.setTimeout(() => void connect(), delay);
    }

    void connect();

    const backup = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void load(true);
    }, INBOX_BACKUP_POLL_MS);

    function onVisible() {
      if (document.visibilityState === 'hidden') return;
      void load(true);
    }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      ac.abort();
      window.clearTimeout(retryTimer);
      window.clearInterval(backup);
      document.removeEventListener('visibilitychange', onVisible);
    };
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
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            <div className="h-10 animate-pulse rounded-md bg-muted/50" />
            <div className="h-10 animate-pulse rounded-md bg-muted/40" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <Shield className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No active OTP requests.</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              When a team member resets a password, changes password, or signs in from a new
              device, their code will appear here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Requested</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.userName ?? '—'}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{formatPurpose(item.purpose)}</TableCell>
                  <TableCell>
                    {item.relayCode ? (
                      <DataTableCopyableText value={item.relayCode} className="font-mono text-sm" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <OtpCountdown expiresAt={item.expiresAt} resendAfter={item.resendAfter} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatWhen(item.createdAt)}
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

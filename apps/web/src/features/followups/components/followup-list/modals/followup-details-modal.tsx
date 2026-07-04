'use client';

import Link from 'next/link';
import type { FollowupDetail } from '@laam/types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FOLLOWUP_SMS_LABELS,
  FOLLOWUP_STATUS_LABELS,
  FOLLOWUP_TYPE_LABELS,
} from '@/features/followups/config/followup-filters';
import { formatFollowupDateTime } from '@/features/followups/components/followup-list/followup-table-columns';

type FollowupDetailsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followup: FollowupDetail | null;
};

export function FollowupDetailsModal({
  open,
  onOpenChange,
  followup,
}: FollowupDetailsModalProps) {
  if (!followup) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Follow-up — {followup.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{FOLLOWUP_TYPE_LABELS[followup.type]}</Badge>
            <Badge variant="outline">{FOLLOWUP_STATUS_LABELS[followup.followupStatus]}</Badge>
            <Badge variant="outline">{FOLLOWUP_SMS_LABELS[followup.smsStatus]}</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Schedule</p>
              <p className="font-medium">{followup.scheduleDate ?? 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Assigned</p>
              <p className="font-medium">{followup.assignedAgentName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mobile</p>
              <p className="font-medium">{followup.phone}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-medium">{formatFollowupDateTime(followup.createdAt)}</p>
            </div>
          </div>
          {followup.followupNotes ? (
            <div>
              <p className="text-xs text-muted-foreground">Follow-up notes</p>
              <p className="mt-1">{followup.followupNotes}</p>
            </div>
          ) : null}
          {followup.customerNotes ? (
            <div>
              <p className="text-xs text-muted-foreground">Customer notes</p>
              <p className="mt-1">{followup.customerNotes}</p>
            </div>
          ) : null}
          {followup.activities.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Activity</p>
              <ol className="space-y-2">
                {followup.activities.map((a) => (
                  <li key={a.id} className="rounded-md border border-border/60 p-2">
                    <p className="font-medium">{a.label}</p>
                    {a.description ? (
                      <p className="text-xs text-muted-foreground">{a.description}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" asChild>
            <Link href={`/dashboard/companies/${followup.customerId}`}>View customer</Link>
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

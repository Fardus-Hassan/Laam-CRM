'use client';

import * as React from 'react';
import type {
  IncentiveAssignment,
  IncentiveChannel,
  IncentiveOpsMonth,
} from '@laam/types';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { FormTextarea } from '@/components/form/form-textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { incentiveApi } from '@/features/incentive/api/incentive-api';
import {
  ORDER_CARD_CLASS,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const CHANNELS: Array<{ value: IncentiveChannel; label: string }> = [
  { value: 'call', label: 'Call' },
  { value: 'facebook_comment', label: 'FB comment' },
  { value: 'messenger', label: 'Messenger' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

type IncentiveOpsPanelProps = {
  yearMonth: string;
  onYearMonthChange?: (yearMonth: string) => void;
  assignments: IncentiveAssignment[];
  canManage: boolean;
  onChanged: () => Promise<void> | void;
};

export function IncentiveOpsPanel({
  yearMonth,
  onYearMonthChange,
  assignments,
  canManage,
  onChanged,
}: IncentiveOpsPanelProps) {
  const [ops, setOps] = React.useState<IncentiveOpsMonth | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const [agentName, setAgentName] = React.useState('');
  const [assignmentId, setAssignmentId] = React.useState('');
  const [surveyCount, setSurveyCount] = React.useState('');
  const [channel, setChannel] = React.useState<IncentiveChannel>('call');
  const [activityCount, setActivityCount] = React.useState('');
  const [presentDays, setPresentDays] = React.useState('');
  const [workingDays, setWorkingDays] = React.useState('26');
  const [bonusAmount, setBonusAmount] = React.useState('');
  const [bonusReason, setBonusReason] = React.useState('');

  const activeAssignments = React.useMemo(
    () => assignments.filter((row) => row.isActive),
    [assignments],
  );

  const loadOps = React.useCallback(async () => {
    setLoading(true);
    try {
      setOps(await incentiveApi.getOps(yearMonth));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load ops');
    } finally {
      setLoading(false);
    }
  }, [yearMonth]);

  React.useEffect(() => {
    void loadOps();
  }, [loadOps]);

  React.useEffect(() => {
    if (!assignmentId) return;
    const row = activeAssignments.find((item) => item.id === assignmentId);
    if (row) setAgentName(row.agentName);
  }, [assignmentId, activeAssignments]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      await loadOps();
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  if (!canManage) {
    return (
      <Card className={ORDER_CARD_CLASS}>
        <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'py-8 text-sm text-muted-foreground')}>
          Only managers can edit attendance, surveys, channels, and special bonuses.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className={ORDER_CARD_CLASS}>
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Ops entry · {yearMonth}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Survey / channel / attendance logs feed Relationship & Night KPI plans. Special
                bonuses add to locked payroll totals.
              </p>
            </div>
            {onYearMonthChange ? (
              <Input
                type="month"
                className="w-44"
                value={yearMonth}
                onChange={(event) => onYearMonthChange(event.target.value)}
              />
            ) : null}
          </div>
        </CardHeader>
        <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'grid gap-3 lg:grid-cols-2')}>
          <FormField label="Agent">
            <FormSearchSelect
              portal
              value={assignmentId}
              onChange={setAssignmentId}
              options={activeAssignments.map((row) => ({
                value: row.id,
                label: `${row.agentName}${row.planName ? ` · ${row.planName}` : ''}`,
              }))}
              placeholder="Pick assigned agent (required)"
            />
          </FormField>
          <FormField label="Agent name">
            <FormInput value={agentName} readOnly placeholder="Filled from assignment" />
          </FormField>

          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-medium">Survey count</p>
            <div className="flex gap-2">
              <FormInput
                type="number"
                min={0}
                value={surveyCount}
                onChange={(e) => setSurveyCount(e.target.value)}
                placeholder="Count"
              />
              <Button
                type="button"
                size="sm"
                disabled={busy || !assignmentId || !agentName.trim()}
                onClick={() =>
                  void run(
                    () =>
                      incentiveApi.upsertSurvey({
                        agentName: agentName.trim(),
                        assignmentId,
                        yearMonth,
                        surveyCount: Number(surveyCount) || 0,
                      }),
                    'Survey log saved',
                  )
                }
              >
                Save survey
              </Button>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-medium">Channel activity</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <FormSearchSelect
                portal
                searchable={false}
                value={channel}
                onChange={(value) => setChannel(value as IncentiveChannel)}
                options={CHANNELS}
              />
              <FormInput
                type="number"
                min={0}
                value={activityCount}
                onChange={(e) => setActivityCount(e.target.value)}
                placeholder="Count"
              />
              <Button
                type="button"
                size="sm"
                disabled={busy || !assignmentId || !agentName.trim()}
                onClick={() =>
                  void run(
                    () =>
                      incentiveApi.upsertChannel({
                        agentName: agentName.trim(),
                        assignmentId,
                        yearMonth,
                        channel,
                        activityCount: Number(activityCount) || 0,
                      }),
                    'Channel log saved',
                  )
                }
              >
                Save
              </Button>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-medium">Attendance</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <FormInput
                type="number"
                min={0}
                value={presentDays}
                onChange={(e) => setPresentDays(e.target.value)}
                placeholder="Present days"
              />
              <FormInput
                type="number"
                min={1}
                value={workingDays}
                onChange={(e) => setWorkingDays(e.target.value)}
                placeholder="Working days"
              />
              <Button
                type="button"
                size="sm"
                disabled={busy || !assignmentId || !agentName.trim()}
                onClick={() =>
                  void run(
                    () =>
                      incentiveApi.upsertAttendance({
                        agentName: agentName.trim(),
                        userId:
                          activeAssignments.find((row) => row.id === assignmentId)?.userId ??
                          null,
                        yearMonth,
                        presentDays: Number(presentDays) || 0,
                        workingDays: Number(workingDays) || 26,
                      }),
                    'Attendance saved',
                  )
                }
              >
                Save attendance
              </Button>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-medium">Special bonus</p>
            <div className="grid gap-2">
              <FormInput
                type="number"
                min={0}
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
                placeholder="Amount ৳"
              />
              <FormTextarea
                value={bonusReason}
                onChange={(e) => setBonusReason(e.target.value)}
                placeholder="Reason"
                rows={2}
              />
              <Button
                type="button"
                size="sm"
                disabled={busy || !assignmentId || !agentName.trim() || !bonusReason.trim()}
                onClick={() =>
                  void run(
                    () =>
                      incentiveApi.createSpecialBonus({
                        agentName: agentName.trim(),
                        assignmentId,
                        yearMonth,
                        amountBdt: Number(bonusAmount) || 0,
                        reason: bonusReason.trim(),
                      }),
                    'Special bonus added',
                  )
                }
              >
                Add bonus
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-base">Surveys</CardTitle>
          </CardHeader>
          <CardContent className={ORDER_SECTION_BODY_CLASS}>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !ops?.surveys.length ? (
              <p className="text-sm text-muted-foreground">No survey logs this month.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ops.surveys.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.agentName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.surveyCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-base">Channels</CardTitle>
          </CardHeader>
          <CardContent className={ORDER_SECTION_BODY_CLASS}>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !ops?.channels.length ? (
              <p className="text-sm text-muted-foreground">No channel logs this month.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ops.channels.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.agentName}</TableCell>
                      <TableCell>{row.channel}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.activityCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-base">Attendance</CardTitle>
          </CardHeader>
          <CardContent className={ORDER_SECTION_BODY_CLASS}>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !ops?.attendance.length ? (
              <p className="text-sm text-muted-foreground">No attendance rows this month.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Bonus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ops.attendance.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.agentName}</TableCell>
                      <TableCell className="tabular-nums">
                        {row.presentDays}/{row.workingDays}
                      </TableCell>
                      <TableCell>
                        {row.attendanceBonusEligible ? 'Eligible' : 'No'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-base">Special bonuses</CardTitle>
          </CardHeader>
          <CardContent className={ORDER_SECTION_BODY_CLASS}>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !ops?.specialBonuses.length ? (
              <p className="text-sm text-muted-foreground">No special bonuses this month.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ops.specialBonuses.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.agentName}</TableCell>
                      <TableCell className="max-w-[12rem] truncate">{row.reason}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(row.amountBdt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () => incentiveApi.deleteSpecialBonus(row.id),
                              'Bonus removed',
                            )
                          }
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

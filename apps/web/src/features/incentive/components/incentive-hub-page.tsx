'use client';

import * as React from 'react';
import type {
  CreateIncentiveTeamPayload,
  IncentiveMetricType,
  IncentiveOverview,
  IncentivePerformanceReport,
  IncentivePeriodRun,
  IncentivePlan,
  IncentiveShiftTemplate,
  IncentiveWarning,
} from '@laam/types';
import { Check, Edit2, Plus, Save, Sparkles, Trash2, WalletCards } from 'lucide-react';
import { toast } from 'sonner';

import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { incentiveApi } from '@/features/incentive/api/incentive-api';
import { AssignmentFormDialog } from '@/features/incentive/components/assignment-form-dialog';
import { PlanFormDialog } from '@/features/incentive/components/plan-form-dialog';
import { SalaryFormDialog } from '@/features/incentive/components/salary-form-dialog';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const METRIC_LABELS: Record<IncentiveMetricType, string> = {
  order_count: 'Order count',
  cross_sell_count: 'Cross-sell count',
  return_ratio: 'Return ratio %',
  recovery_count: 'Recovery count',
  manual: 'Manual',
};

const WARNING_LABELS: Record<Exclude<IncentiveWarning, 'none'>, string> = {
  below_target: 'Below target',
  above_return_cap: 'Above return cap',
  manual_missing: 'Manual actual missing',
  final_warning: 'Final warning',
};

const DEFAULT_SHIFTS: IncentiveShiftTemplate[] = [
  { id: 'morning', name: 'Morning', startTime: '09:00', endTime: '18:00', reportingTime: '08:50' },
  { id: 'evening', name: 'Evening', startTime: '13:00', endTime: '22:00', reportingTime: '12:50' },
  { id: 'night', name: 'Night', startTime: '22:00', endTime: '07:00', reportingTime: '21:50' },
];

function currentYearMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

type HubTab = 'performance' | 'plans' | 'assignments' | 'salary' | 'payout';

export function IncentiveHubPage() {
  const { can } = usePermissions();
  const canManage = can('incentive.manage');
  const [data, setData] = React.useState<IncentiveOverview | null>(null);
  const [performance, setPerformance] = React.useState<IncentivePerformanceReport | null>(null);
  const [periods, setPeriods] = React.useState<IncentivePeriodRun[]>([]);
  const [yearMonth, setYearMonth] = React.useState(currentYearMonth);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [tab, setTab] = React.useState<HubTab>('performance');
  const [teamOpen, setTeamOpen] = React.useState(false);
  const [teamName, setTeamName] = React.useState('');
  const [planOpen, setPlanOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<IncentivePlan | null>(null);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [salaryOpen, setSalaryOpen] = React.useState(false);
  const [manualDrafts, setManualDrafts] = React.useState<Record<string, string>>({});
  const [shiftDrafts, setShiftDrafts] = React.useState<IncentiveShiftTemplate[]>([]);

  const selectedPeriod = periods.find((period) => period.yearMonth === yearMonth) ?? null;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [overview, report, periodRows] = await Promise.all([
        incentiveApi.getOverview(),
        incentiveApi.getPerformance(yearMonth),
        incentiveApi.listPeriods(),
      ]);
      setData(overview);
      setPerformance(report);
      setPeriods(periodRows);
      setShiftDrafts(overview.shiftTemplates ?? []);
      setManualDrafts(
        Object.fromEntries(
          report.lines
            .filter((line) => line.metricType === 'manual')
            .map((line) => [line.assignmentId, String(line.actualValue)]),
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load incentive hub');
    } finally {
      setLoading(false);
    }
  }, [yearMonth]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateTeam() {
    const payload: CreateIncentiveTeamPayload = { name: teamName.trim() };
    if (!payload.name) return;
    await runAction(() => incentiveApi.createTeam(payload), 'Team created');
    setTeamName('');
    setTeamOpen(false);
  }

  async function handleDeletePlan(plan: IncentivePlan) {
    if (!confirm(`Delete plan “${plan.name}”?`)) return;
    await runAction(() => incentiveApi.deletePlan(plan.id), 'Plan deleted');
  }

  async function handleDeleteAssignment(id: string) {
    await runAction(() => incentiveApi.deleteAssignment(id), 'Assignment removed');
  }

  async function saveManualActual(assignmentId: string) {
    const actualValue = Number(manualDrafts[assignmentId]);
    if (!Number.isFinite(actualValue)) {
      toast.error('Enter a valid manual actual');
      return;
    }
    await runAction(
      () => incentiveApi.upsertManualActual({ assignmentId, yearMonth, actualValue }),
      'Manual actual saved',
    );
  }

  async function saveShifts() {
    if (shiftDrafts.some((shift) => !shift.name.trim() || !shift.startTime || !shift.endTime)) {
      toast.error('Each shift needs a name, start, and end time');
      return;
    }
    await runAction(() => incentiveApi.upsertShifts({ shifts: shiftDrafts }), 'Shifts saved');
  }

  function patchShift(index: number, patch: Partial<IncentiveShiftTemplate>) {
    setShiftDrafts((current) =>
      current.map((shift, rowIndex) => (rowIndex === index ? { ...shift, ...patch } : shift)),
    );
  }

  const empty = !loading && data?.teamCount === 0;

  return (
    <PageShell
      title="Incentive & KPI"
      description="Configurable team targets, agent performance, and locked monthly payouts."
    >
      <div className={cn('flex flex-col', ORDER_PAGE_GAP)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1 border-b pb-2">
            {(
              [
                ['performance', 'Performance'],
                ['plans', 'Plans & slabs'],
                ['assignments', 'Assignments'],
                ['salary', 'Salary & shifts'],
                ['payout', 'Payout'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm',
                  tab === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              {empty ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    void runAction(
                      () => incentiveApi.seedDefaults(),
                      'Default incentive template seeded',
                    )
                  }
                >
                  <Sparkles className="size-4" />
                  Seed template
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="outline" onClick={() => setTeamOpen(true)}>
                <Plus className="size-4" />
                Team
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingPlan(null);
                  setPlanOpen(true);
                }}
              >
                <Plus className="size-4" />
                Plan
              </Button>
              <Button type="button" size="sm" onClick={() => setAssignOpen(true)}>
                <Plus className="size-4" />
                Assign agent
              </Button>
            </div>
          ) : null}
        </div>

        <CrmSummaryStrip
          items={[
            { id: 'teams', label: 'Teams', value: String(data?.teamCount ?? '—') },
            { id: 'plans', label: 'Plans', value: String(data?.planCount ?? '—') },
            { id: 'assignments', label: 'Assignments', value: String(data?.assignmentCount ?? '—') },
            {
              id: 'payout',
              label: selectedPeriod ? 'Locked payout' : 'Live estimate',
              value: performance ? formatCurrency(performance.totalIncentiveBdt) : '—',
            },
          ]}
        />

        {tab === 'performance' ? (
          <div className="space-y-3">
            {performance?.teamRollups?.length ? (
              <Card className={ORDER_CARD_CLASS}>
                <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                  <CardTitle className="text-base">Team target rollups</CardTitle>
                </CardHeader>
                <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'grid gap-2 sm:grid-cols-2 lg:grid-cols-3')}>
                  {performance.teamRollups.map((rollup) => (
                    <div key={rollup.planId} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{rollup.planName}</p>
                        <Badge variant={rollup.met ? 'success' : 'secondary'}>
                          {rollup.met ? 'Met' : 'In progress'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{rollup.teamName ?? 'No team'}</p>
                      <p className="mt-2 text-sm tabular-nums">
                        {rollup.actualTotal} / {rollup.teamMonthlyTarget ?? '—'}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex flex-row items-center gap-3')}>
                <CardTitle className="flex-1 text-base">Monthly performance</CardTitle>
                <Input
                  type="month"
                  className="w-40"
                  value={yearMonth}
                  onChange={(event) => setYearMonth(event.target.value)}
                />
              </CardHeader>
              <CardContent className={ORDER_SECTION_BODY_CLASS}>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : !performance?.lines.length ? (
                  <p className="text-sm text-muted-foreground">No active assignments for this month.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent / warning</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Slab</TableHead>
                        <TableHead className="text-right">Incentive</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performance.lines.map((line) => (
                        <TableRow key={line.assignmentId}>
                          <TableCell>
                            <p className="font-medium">{line.agentName}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {line.warning && line.warning !== 'none' ? (
                                <Badge variant={line.warning === 'final_warning' ? 'destructive' : 'secondary'}>
                                  {WARNING_LABELS[line.warning]}
                                </Badge>
                              ) : null}
                              {(line.consecutiveMissMonths ?? 0) > 0 ? (
                                <Badge variant="outline">{line.consecutiveMissMonths} consecutive miss</Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>{line.planName}</div>
                            <div className="text-xs text-muted-foreground">
                              {line.teamName ?? 'No team'} · {METRIC_LABELS[line.metricType]}
                            </div>
                          </TableCell>
                          <TableCell>
                            {line.metricType === 'manual' && canManage && !selectedPeriod ? (
                              <div className="flex min-w-36 items-center gap-1">
                                <Input
                                  type="number"
                                  className="h-8 w-24"
                                  value={manualDrafts[line.assignmentId] ?? ''}
                                  onChange={(event) =>
                                    setManualDrafts((current) => ({
                                      ...current,
                                      [line.assignmentId]: event.target.value,
                                    }))
                                  }
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  disabled={busy}
                                  onClick={() => void saveManualActual(line.assignmentId)}
                                >
                                  <Save className="size-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <span className="tabular-nums">
                                {line.metricType === 'return_ratio' ? `${line.actualValue}%` : line.actualValue}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {line.matchedSlabLabel ?? '—'}
                            {line.prorataApplied ? <Badge className="ml-2" variant="secondary">prorata</Badge> : null}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(line.incentiveBdt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {tab === 'plans' ? (
          <div className="space-y-3">
            {(data?.plans ?? []).map((plan) => (
              <Card key={plan.id} className={ORDER_CARD_CLASS}>
                <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex flex-row items-start justify-between gap-2')}>
                  <div>
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan.teamName ?? 'No team'} · {METRIC_LABELS[plan.metricType]}
                      {plan.teamMonthlyTarget != null ? ` · team target ${plan.teamMonthlyTarget}` : ''}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingPlan(plan);
                          setPlanOpen(true);
                        }}
                      >
                        <Edit2 className="size-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => void handleDeletePlan(plan)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent className={ORDER_SECTION_BODY_CLASS}>
                  {!plan.slabs.length ? (
                    <p className="text-sm text-muted-foreground">No slabs configured.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Label</TableHead>
                          <TableHead className="text-right">Daily</TableHead>
                          <TableHead className="text-right">Monthly</TableHead>
                          <TableHead className="text-right">Incentive</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plan.slabs.map((slab) => (
                          <TableRow key={slab.id}>
                            <TableCell>{slab.label ?? '—'}</TableCell>
                            <TableCell className="text-right">{slab.dailyTarget ?? '—'}</TableCell>
                            <TableCell className="text-right">{slab.monthlyTarget}</TableCell>
                            <TableCell className="text-right">{formatCurrency(slab.incentiveBdt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {tab === 'assignments' ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'pt-4')}>
              {!data?.assignments.length ? (
                <p className="text-sm text-muted-foreground">No agents assigned.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Starts</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{assignment.agentName}</TableCell>
                        <TableCell>{assignment.planName}</TableCell>
                        <TableCell className="capitalize">{assignment.shift ?? '—'}</TableCell>
                        <TableCell>{assignment.startsOn}</TableCell>
                        <TableCell>
                          <Badge variant={assignment.isActive ? 'success' : 'secondary'}>
                            {assignment.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canManage ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => void handleDeleteAssignment(assignment.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : null}

        {tab === 'salary' ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex flex-row items-center justify-between')}>
                <CardTitle className="text-base">Salary reference</CardTitle>
                {canManage ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => setSalaryOpen(true)}>
                    <Edit2 className="size-3.5" />
                    Edit
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className={ORDER_SECTION_BODY_CLASS}>
                {!data?.salaryTemplate ? (
                  <p className="text-sm text-muted-foreground">No salary reference configured.</p>
                ) : (
                  <Table>
                    <TableBody>
                      {[
                        ['Basic', data.salaryTemplate.basicBdt],
                        ['House rent', data.salaryTemplate.houseRentBdt],
                        ['Medical', data.salaryTemplate.medicalBdt],
                        ['Conveyance', data.salaryTemplate.conveyanceBdt],
                        ['Gross', data.salaryTemplate.grossBdt],
                        ['Attendance bonus', data.salaryTemplate.attendanceBonusBdt],
                        ['Lunch & snacks', data.salaryTemplate.lunchBdt],
                        ['Total', data.salaryTemplate.totalBdt],
                      ].map(([label, amount]) => (
                        <TableRow key={String(label)}>
                          <TableCell>{label}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(Number(amount))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex flex-row items-center justify-between')}>
                <CardTitle className="text-base">Duty shifts</CardTitle>
                {canManage ? (
                  <div className="flex gap-2">
                    {!shiftDrafts.length ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => setShiftDrafts(DEFAULT_SHIFTS)}>
                        Seed defaults
                      </Button>
                    ) : null}
                    <Button type="button" size="sm" disabled={busy} onClick={() => void saveShifts()}>
                      <Save className="size-3.5" />
                      Save
                    </Button>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-2')}>
                {!shiftDrafts.length ? (
                  <p className="text-sm text-muted-foreground">No shift templates configured.</p>
                ) : (
                  shiftDrafts.map((shift, index) => (
                    <div key={shift.id} className="grid grid-cols-[1fr_6rem_6rem_auto] items-end gap-2 rounded-md border p-2">
                      <div>
                        <Label className="text-xs">Name</Label>
                        <Input
                          className="mt-1 h-8"
                          value={shift.name}
                          disabled={!canManage}
                          onChange={(event) => patchShift(index, { name: event.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Start</Label>
                        <Input
                          type="time"
                          className="mt-1 h-8"
                          value={shift.startTime}
                          disabled={!canManage}
                          onChange={(event) => patchShift(index, { startTime: event.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">End</Label>
                        <Input
                          type="time"
                          className="mt-1 h-8"
                          value={shift.endTime}
                          disabled={!canManage}
                          onChange={(event) => patchShift(index, { endTime: event.target.value })}
                        />
                      </div>
                      {canManage ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setShiftDrafts((current) => current.filter((_, row) => row !== index))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {tab === 'payout' ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex flex-row flex-wrap items-center gap-2')}>
              <div className="flex-1">
                <CardTitle className="text-base">Monthly payout run</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Generate a locked snapshot, approve it, then mark payroll paid.
                </p>
              </div>
              <Input type="month" className="w-40" value={yearMonth} onChange={(event) => setYearMonth(event.target.value)} />
              {selectedPeriod ? <Badge variant="secondary" className="capitalize">{selectedPeriod.status}</Badge> : null}
              {canManage && (!selectedPeriod || selectedPeriod.status === 'draft') ? (
                <Button
                  type="button"
                  size="sm"
                  variant={selectedPeriod ? 'outline' : 'default'}
                  disabled={busy}
                  onClick={() => void runAction(() => incentiveApi.generatePeriod(yearMonth), 'Payout period generated')}
                >
                  <WalletCards className="size-4" />
                  {selectedPeriod ? 'Regenerate' : 'Generate'}
                </Button>
              ) : null}
              {canManage && selectedPeriod?.status === 'draft' ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void runAction(() => incentiveApi.approvePeriod(yearMonth), 'Payout approved')}
                >
                  <Check className="size-4" />
                  Approve
                </Button>
              ) : null}
              {canManage && selectedPeriod?.status === 'approved' ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void runAction(() => incentiveApi.markPeriodPaid(yearMonth), 'Payout marked paid')}
                >
                  Mark paid
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className={ORDER_SECTION_BODY_CLASS}>
              {periods.length ? (
                <div className="mb-4 flex flex-wrap items-center gap-2 border-b pb-3">
                  <span className="text-xs font-medium text-muted-foreground">Period history</span>
                  {periods.map((period) => (
                    <button
                      key={period.id}
                      type="button"
                      onClick={() => setYearMonth(period.yearMonth)}
                      className={cn(
                        'rounded-md border px-2 py-1 text-xs',
                        period.yearMonth === yearMonth
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'hover:bg-muted',
                      )}
                    >
                      {period.yearMonth} · {period.status}
                    </button>
                  ))}
                </div>
              ) : null}
              {!selectedPeriod ? (
                <p className="text-sm text-muted-foreground">
                  No locked payout for {yearMonth}. Current live estimate is{' '}
                  {formatCurrency(performance?.totalIncentiveBdt ?? 0)}.
                </p>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <span>Calculated {new Date(selectedPeriod.calculatedAt).toLocaleString()}</span>
                    {selectedPeriod.approvedByName ? <span>Approved by {selectedPeriod.approvedByName}</span> : null}
                    {selectedPeriod.paidByName ? <span>Paid by {selectedPeriod.paidByName}</span> : null}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead>Slab</TableHead>
                        <TableHead className="text-right">Locked payout</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPeriod.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="font-medium">{line.agentName}</TableCell>
                          <TableCell>{line.planName}</TableCell>
                          <TableCell className="text-right">{line.actualValue}</TableCell>
                          <TableCell>{line.matchedSlabLabel ?? '—'}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(line.incentiveBdt)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={4} className="font-medium">Total</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(selectedPeriod.totalIncentiveBdt)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New team</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="incentive-team-name">Name</Label>
            <Input
              id="incentive-team-name"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="e.g. Telesales"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTeamOpen(false)}>Cancel</Button>
            <Button type="button" disabled={busy} onClick={() => void handleCreateTeam()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanFormDialog
        open={planOpen}
        initial={editingPlan}
        teams={data?.teams ?? []}
        onClose={() => setPlanOpen(false)}
        onSaved={() => void load()}
      />
      <AssignmentFormDialog
        open={assignOpen}
        plans={data?.plans ?? []}
        onClose={() => setAssignOpen(false)}
        onSaved={() => void load()}
      />
      <SalaryFormDialog
        open={salaryOpen}
        initial={data?.salaryTemplate}
        onClose={() => setSalaryOpen(false)}
        onSaved={() => void load()}
      />
    </PageShell>
  );
}

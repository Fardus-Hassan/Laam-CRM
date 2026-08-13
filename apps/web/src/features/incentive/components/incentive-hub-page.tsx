'use client';

import * as React from 'react';
import type {
  CreateIncentiveTeamPayload,
  IncentiveChannel,
  IncentiveHrStatus,
  IncentiveMetricType,
  IncentiveOpsMonth,
  IncentiveOverview,
  IncentivePerformanceReport,
  IncentivePeriodRun,
  IncentivePlan,
  IncentiveShiftTemplate,
  IncentiveTeam,
  IncentiveWarning,
  UpdateIncentiveTeamPayload,
} from '@laam/types';
import {
  Check,
  Download,
  Edit2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  WalletCards,
} from 'lucide-react';
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
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { useAuth } from '@/features/auth/hooks/use-auth';
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
import { formatCurrency, formatDateTime } from '@/lib/format';
import { downloadCsv, downloadTextFile } from '@/lib/export-csv';
import { cn } from '@/lib/utils';

const METRIC_LABELS: Record<IncentiveMetricType, string> = {
  order_count: 'Order count',
  cross_sell_count: 'Cross-sell count',
  return_ratio: 'Return ratio %',
  recovery_count: 'Recovery count',
  survey_count: 'Survey count',
  channel_activity: 'Channel activity',
  manual: 'Manual',
};

const WARNING_LABELS: Record<Exclude<IncentiveWarning, 'none'>, string> = {
  below_target: 'Below target',
  below_daily_entry: 'Below daily entry',
  above_return_cap: 'Above return cap',
  manual_missing: 'Manual actual missing',
  final_warning: 'Final warning',
  terminated: 'Terminated',
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

type HubTab = 'performance' | 'ops' | 'plans' | 'assignments' | 'salary' | 'payout';

const HR_LABELS: Record<IncentiveHrStatus, string> = {
  active: 'Active',
  warning: 'Warning',
  final_warning: 'Final warning',
  terminated: 'Terminated',
};

const CHANNEL_LABELS: Record<IncentiveChannel, string> = {
  call: 'Call',
  facebook_comment: 'Facebook comments',
  messenger: 'Messenger',
  whatsapp: 'WhatsApp',
};

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function parseAttendanceCsv(text: string): Array<{
  agentName: string;
  presentDays: number;
  workingDays: number;
  lateCount: number;
  earlyLeaveCount: number;
  unapprovedAbsence: number;
}> {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]!).map((h) => h.toLowerCase().replace(/\s+/g, ''));
  const idx = (names: string[]) => headers.findIndex((h) => names.includes(h));
  const agentIdx = idx(['agentname', 'agent', 'name']);
  const presentIdx = idx(['presentdays', 'present']);
  const workingIdx = idx(['workingdays', 'working']);
  const lateIdx = idx(['latecount', 'late']);
  const earlyIdx = idx(['earlyleavecount', 'earlyleave']);
  const absentIdx = idx(['unapprovedabsence', 'absence', 'absent']);
  if (agentIdx < 0 || presentIdx < 0 || workingIdx < 0) {
    throw new Error(
      'CSV needs agentName, presentDays, workingDays columns (optional: lateCount, earlyLeaveCount, unapprovedAbsence)',
    );
  }
  const rows = [];
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const agentName = cells[agentIdx]?.trim() ?? '';
    if (!agentName) continue;
    const presentDays = Number(cells[presentIdx] ?? 0);
    const workingDays = Number(cells[workingIdx] ?? 0);
    if (!Number.isFinite(presentDays) || !Number.isFinite(workingDays) || workingDays < 1) {
      continue;
    }
    rows.push({
      agentName,
      presentDays,
      workingDays,
      lateCount: Number(cells[lateIdx] ?? 0) || 0,
      earlyLeaveCount: Number(cells[earlyIdx] ?? 0) || 0,
      unapprovedAbsence: Number(cells[absentIdx] ?? 0) || 0,
    });
  }
  return rows;
}

function OpsTableCard({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <Card className={ORDER_CARD_CLASS}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className={ORDER_SECTION_BODY_CLASS}>
        {!rows.length ? (
          <p className="text-sm text-muted-foreground">No entries for this month.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header) => (
                  <TableHead key={header}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function IncentiveHubPage() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const { can } = usePermissions();
  const { user } = useAuth();
  const canManage = can('incentive.manage');
  const [data, setData] = React.useState<IncentiveOverview | null>(null);
  const [performance, setPerformance] = React.useState<IncentivePerformanceReport | null>(null);
  const [periods, setPeriods] = React.useState<IncentivePeriodRun[]>([]);
  const [ops, setOps] = React.useState<IncentiveOpsMonth | null>(null);
  const [yearMonth, setYearMonth] = React.useState(currentYearMonth);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [tab, setTab] = React.useState<HubTab>('performance');
  const [teamOpen, setTeamOpen] = React.useState(false);
  const [editingTeam, setEditingTeam] = React.useState<IncentiveTeam | null>(null);
  const [teamName, setTeamName] = React.useState('');
  const [teamActive, setTeamActive] = React.useState(true);
  const attendanceFileRef = React.useRef<HTMLInputElement>(null);
  const [planOpen, setPlanOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<IncentivePlan | null>(null);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [editingAssignment, setEditingAssignment] = React.useState<
    IncentiveOverview['assignments'][number] | null
  >(null);
  const [salaryOpen, setSalaryOpen] = React.useState(false);
  const [manualDrafts, setManualDrafts] = React.useState<Record<string, string>>({});
  const [shiftDrafts, setShiftDrafts] = React.useState<IncentiveShiftTemplate[]>([]);
  const [opsAgent, setOpsAgent] = React.useState('');
  const [opsAssignmentId, setOpsAssignmentId] = React.useState('');
  const [opsValue, setOpsValue] = React.useState('');
  const [opsSecondaryValue, setOpsSecondaryValue] = React.useState('');
  const [opsChannel, setOpsChannel] = React.useState<IncentiveChannel>('call');
  const [opsReason, setOpsReason] = React.useState('');

  const selectedPeriod = periods.find((period) => period.yearMonth === yearMonth) ?? null;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [overview, report, periodRows, opsMonth] = await Promise.all([
        incentiveApi.getOverview(),
        incentiveApi.getPerformance(yearMonth),
        incentiveApi.listPeriods(),
        incentiveApi.getOps(yearMonth),
      ]);
      setData(overview);
      setPerformance(report);
      setPeriods(periodRows);
      setOps(opsMonth);
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

  async function handleSaveTeam() {
    const name = teamName.trim();
    if (!name) return;
    if (editingTeam) {
      const payload: UpdateIncentiveTeamPayload = {
        name,
        isActive: teamActive,
      };
      await runAction(() => incentiveApi.updateTeam(editingTeam.id, payload), 'Team updated');
    } else {
      const payload: CreateIncentiveTeamPayload = { name, isActive: teamActive };
      await runAction(() => incentiveApi.createTeam(payload), 'Team created');
    }
    setTeamName('');
    setTeamActive(true);
    setEditingTeam(null);
    setTeamOpen(false);
  }

  function openCreateTeam() {
    setEditingTeam(null);
    setTeamName('');
    setTeamActive(true);
    setTeamOpen(true);
  }

  function openEditTeam(team: IncentiveTeam) {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamActive(team.isActive);
    setTeamOpen(true);
  }

  async function handleAttendanceCsv(file: File) {
    setBusy(true);
    try {
      const text = await file.text();
      const rows = parseAttendanceCsv(text);
      if (!rows.length) {
        throw new Error('No valid attendance rows found in CSV');
      }
      for (const row of rows) {
        await incentiveApi.upsertAttendance({
          agentName: row.agentName,
          yearMonth,
          presentDays: row.presentDays,
          workingDays: row.workingDays,
          lateCount: row.lateCount,
          earlyLeaveCount: row.earlyLeaveCount,
          unapprovedAbsence: row.unapprovedAbsence,
        });
      }
      toast.success(`Imported attendance for ${rows.length} agent(s)`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Attendance import failed');
    } finally {
      setBusy(false);
      if (attendanceFileRef.current) attendanceFileRef.current.value = '';
    }
  }

  async function handlePayrollExport() {
    setBusy(true);
    try {
      const pack = await incentiveApi.exportPayrollCsv(yearMonth);
      downloadTextFile(pack.filename, pack.csv);
      toast.success('Payroll CSV downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payroll export failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeletePlan(plan: IncentivePlan) {
    const ok = await confirm({
      title: `Delete plan “${plan.name}”?`,
      description: 'This incentive plan will be permanently removed.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
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
  const selfOnly = !canManage;
  const currentUserName = user?.name.trim().toLocaleLowerCase() ?? '';
  const visiblePerformanceLines = (performance?.lines ?? []).filter(
    (line) =>
      !selfOnly || line.agentName.trim().toLocaleLowerCase() === currentUserName,
  );
  const visiblePayoutLines = (selectedPeriod?.lines ?? []).filter(
    (line) =>
      !selfOnly || line.agentName.trim().toLocaleLowerCase() === currentUserName,
  );
  const visibleAssignments = (data?.assignments ?? []).filter(
    (row) => !selfOnly || row.agentName.trim().toLocaleLowerCase() === currentUserName,
  );

  function selectOpsAgent(assignmentId: string) {
    const assignment = data?.assignments.find((row) => row.id === assignmentId);
    setOpsAssignmentId(assignmentId);
    setOpsAgent(assignment?.agentName ?? '');
  }

  async function saveOps(kind: 'attendance' | 'survey' | 'channel' | 'bonus') {
    if (!opsAgent.trim()) {
      toast.error('Select or enter an agent');
      return;
    }
    const value = Number(opsValue);
    if (!Number.isFinite(value)) {
      toast.error('Enter a valid value');
      return;
    }
    const assignment = data?.assignments.find((row) => row.id === opsAssignmentId);
    const action =
      kind === 'attendance'
        ? () =>
            incentiveApi.upsertAttendance({
              yearMonth,
              agentName: opsAgent.trim(),
              userId: assignment?.userId,
              presentDays: value,
              workingDays: Number(opsSecondaryValue) || 26,
            })
        : kind === 'survey'
          ? () =>
              incentiveApi.upsertSurvey({
                yearMonth,
                agentName: opsAgent.trim(),
                assignmentId: opsAssignmentId || null,
                surveyCount: value,
              })
          : kind === 'channel'
            ? () =>
                incentiveApi.upsertChannel({
                  yearMonth,
                  agentName: opsAgent.trim(),
                  assignmentId: opsAssignmentId || null,
                  channel: opsChannel,
                  activityCount: value,
                })
            : () =>
                incentiveApi.createSpecialBonus({
                  yearMonth,
                  agentName: opsAgent.trim(),
                  assignmentId: opsAssignmentId || null,
                  amountBdt: value,
                  reason: opsReason.trim(),
                });
    if (kind === 'bonus' && !opsReason.trim()) {
      toast.error('Bonus reason is required');
      return;
    }
    await runAction(action, `${kind === 'bonus' ? 'Special bonus' : kind} saved`);
    setOpsValue('');
    setOpsSecondaryValue('');
    setOpsReason('');
  }

  return (
    <PageShell
      title="Incentive & KPI"
      description="CRM calculates KPI & locks payouts; export CSV to your payroll system. Not a full HRIS/bank disbursement tool."
    >
      <div className={cn('flex flex-col', ORDER_PAGE_GAP)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1 border-b pb-2">
            {(
              [
                ['performance', 'Performance'],
                ['ops', 'Ops'],
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void runAction(
                    () => incentiveApi.seedSyncMissing(),
                    'Missing agent assignments synced',
                  )
                }
              >
                <RefreshCw className="size-4" />
                Sync missing
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={openCreateTeam}>
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
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditingAssignment(null);
                  setAssignOpen(true);
                }}
              >
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
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!visiblePerformanceLines.length}
                  onClick={() =>
                    downloadCsv(
                      `incentive-performance-${yearMonth}.csv`,
                      [
                        'Agent',
                        'Plan',
                        'Metric',
                        'Actual',
                        'Slab',
                        'HR status',
                        'Incentive',
                        'Attendance bonus',
                        'Special bonus',
                        'Total pay',
                      ],
                      visiblePerformanceLines.map((line) => [
                        line.agentName,
                        line.planName,
                        METRIC_LABELS[line.metricType],
                        line.actualValue,
                        line.matchedSlabLabel,
                        line.hrStatus ? HR_LABELS[line.hrStatus] : '',
                        line.incentiveBdt,
                        line.attendanceBonusBdt,
                        line.specialBonusBdt,
                        line.totalPayBdt,
                      ]),
                    )
                  }
                >
                  <Download className="size-4" />
                  CSV
                </Button>
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
                ) : !visiblePerformanceLines.length ? (
                  <p className="text-sm text-muted-foreground">No active assignments for this month.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent / warning</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Slab</TableHead>
                        <TableHead>HR</TableHead>
                        <TableHead className="text-right">Incentive</TableHead>
                        <TableHead className="text-right">Attendance</TableHead>
                        <TableHead className="text-right">Special</TableHead>
                        <TableHead className="text-right">Total pay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visiblePerformanceLines.map((line) => (
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
                          <TableCell>
                            {line.hrStatus ? (
                              <Badge
                                variant={
                                  line.hrStatus === 'terminated'
                                    ? 'destructive'
                                    : line.hrStatus === 'active'
                                      ? 'success'
                                      : 'secondary'
                                }
                              >
                                {HR_LABELS[line.hrStatus]}
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(line.incentiveBdt)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(line.attendanceBonusBdt ?? 0)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(line.specialBonusBdt ?? 0)}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatCurrency(
                              line.totalPayBdt ??
                                line.incentiveBdt +
                                  (line.attendanceBonusBdt ?? 0) +
                                  (line.specialBonusBdt ?? 0),
                            )}
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

        {tab === 'ops' ? (
          <div className="space-y-3">
            <Card className={ORDER_CARD_CLASS}>
              <CardHeader
                className={cn(
                  ORDER_SECTION_HEADER_CLASS,
                  'flex flex-row flex-wrap items-center gap-2',
                )}
              >
                <div className="flex-1">
                  <CardTitle className="text-base">Monthly operations</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Attendance, survey, channel, and exceptional bonus inputs.
                  </p>
                </div>
                <Input
                  type="month"
                  className="w-40"
                  value={yearMonth}
                  onChange={(event) => setYearMonth(event.target.value)}
                />
              </CardHeader>
              {canManage ? (
                <CardContent
                  className={cn(
                    ORDER_SECTION_BODY_CLASS,
                    'grid gap-2 border-t pt-3 md:grid-cols-6',
                  )}
                >
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm md:col-span-2"
                    value={opsAssignmentId}
                    onChange={(event) => selectOpsAgent(event.target.value)}
                  >
                    <option value="">Select assigned agent</option>
                    {(data?.assignments ?? []).map((assignment) => (
                      <option key={assignment.id} value={assignment.id}>
                        {assignment.agentName} · {assignment.planName}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Agent name"
                    value={opsAgent}
                    onChange={(event) => setOpsAgent(event.target.value)}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Value / amount"
                    value={opsValue}
                    onChange={(event) => setOpsValue(event.target.value)}
                  />
                  <Input
                    type="number"
                    min={1}
                    placeholder="Working days"
                    value={opsSecondaryValue}
                    onChange={(event) => setOpsSecondaryValue(event.target.value)}
                  />
                  <Button type="button" disabled={busy} onClick={() => void saveOps('attendance')}>
                    Save attendance
                  </Button>
                  <input
                    ref={attendanceFileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleAttendanceCsv(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => attendanceFileRef.current?.click()}
                  >
                    <Upload className="size-4" />
                    Import CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void saveOps('survey')}
                  >
                    Save survey
                  </Button>
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={opsChannel}
                    onChange={(event) => setOpsChannel(event.target.value as IncentiveChannel)}
                  >
                    {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void saveOps('channel')}
                  >
                    Save channel
                  </Button>
                  <Input
                    className="md:col-span-2"
                    placeholder="Special bonus reason"
                    value={opsReason}
                    onChange={(event) => setOpsReason(event.target.value)}
                  />
                  <Button type="button" disabled={busy} onClick={() => void saveOps('bonus')}>
                    Add special bonus
                  </Button>
                </CardContent>
              ) : null}
            </Card>

            <div className="grid gap-3 xl:grid-cols-2">
              <OpsTableCard
                title="Attendance"
                headers={['Agent', 'Present / working', 'Late', 'Eligible']}
                rows={(ops?.attendance ?? [])
                  .filter(
                    (row) =>
                      !selfOnly ||
                      row.agentName.trim().toLocaleLowerCase() === currentUserName,
                  )
                  .map((row) => [
                    row.agentName,
                    `${row.presentDays} / ${row.workingDays}`,
                    row.lateCount,
                    row.attendanceBonusEligible ? 'Yes' : 'No',
                  ])}
              />
              <OpsTableCard
                title="Surveys"
                headers={['Agent', 'Count', 'Note']}
                rows={(ops?.surveys ?? [])
                  .filter(
                    (row) =>
                      !selfOnly ||
                      row.agentName.trim().toLocaleLowerCase() === currentUserName,
                  )
                  .map((row) => [row.agentName, row.surveyCount, row.note ?? '—'])}
              />
              <OpsTableCard
                title="Channel activity"
                headers={['Agent', 'Channel', 'Count']}
                rows={(ops?.channels ?? [])
                  .filter(
                    (row) =>
                      !selfOnly ||
                      row.agentName.trim().toLocaleLowerCase() === currentUserName,
                  )
                  .map((row) => [
                    row.agentName,
                    CHANNEL_LABELS[row.channel],
                    row.activityCount,
                  ])}
              />
              <Card className={ORDER_CARD_CLASS}>
                <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                  <CardTitle className="text-base">Special bonuses</CardTitle>
                </CardHeader>
                <CardContent className={ORDER_SECTION_BODY_CLASS}>
                  {!ops?.specialBonuses.length ? (
                    <p className="text-sm text-muted-foreground">No entries for this month.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          {canManage ? <TableHead /> : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ops.specialBonuses
                          .filter(
                            (row) =>
                              !selfOnly ||
                              row.agentName.trim().toLocaleLowerCase() === currentUserName,
                          )
                          .map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-medium">{row.agentName}</TableCell>
                              <TableCell>{row.reason}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(row.amountBdt)}
                              </TableCell>
                              {canManage ? (
                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    disabled={busy}
                                    onClick={() =>
                                      void runAction(
                                        () => incentiveApi.deleteSpecialBonus(row.id),
                                        'Special bonus deleted',
                                      )
                                    }
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </TableCell>
                              ) : null}
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}

        {tab === 'plans' ? (
          <div className="space-y-3">
            {(data?.teams ?? []).length ? (
              <Card className={ORDER_CARD_CLASS}>
                <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                  <CardTitle className="text-base">Teams</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Edit names or deactivate teams without deleting history.
                  </p>
                </CardHeader>
                <CardContent className={ORDER_SECTION_BODY_CLASS}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.teams ?? []).map((team) => (
                        <TableRow key={team.id}>
                          <TableCell>{team.name}</TableCell>
                          <TableCell>
                            <Badge variant={team.isActive ? 'secondary' : 'outline'}>
                              {team.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {canManage ? (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => openEditTeam(team)}
                              >
                                <Edit2 className="size-4" />
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}
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
              {!visibleAssignments.length ? (
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
                      <TableHead>HR</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleAssignments.map((assignment) => (
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
                        <TableCell>
                          <Badge
                            variant={
                              assignment.hrStatus === 'terminated'
                                ? 'destructive'
                                : assignment.hrStatus === 'active' || !assignment.hrStatus
                                  ? 'success'
                                  : 'secondary'
                            }
                          >
                            {HR_LABELS[assignment.hrStatus ?? 'active']}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canManage ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingAssignment(assignment);
                                  setAssignOpen(true);
                                }}
                              >
                                <Edit2 className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => void handleDeleteAssignment(assignment.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
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
                  Generate → approve → export payroll CSV → mark paid. CRM locks numbers; finance pays outside.
                </p>
              </div>
              <Input type="month" className="w-40" value={yearMonth} onChange={(event) => setYearMonth(event.target.value)} />
              {selectedPeriod ? <Badge variant="secondary" className="capitalize">{selectedPeriod.status}</Badge> : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!visiblePayoutLines.length}
                onClick={() =>
                  downloadCsv(
                    `incentive-payout-${yearMonth}.csv`,
                    [
                      'Agent',
                      'Plan',
                      'Actual',
                      'Slab',
                      'HR status',
                      'Incentive',
                      'Attendance bonus',
                      'Special bonus',
                      'Total pay',
                    ],
                    visiblePayoutLines.map((line) => [
                      line.agentName,
                      line.planName,
                      line.actualValue,
                      line.matchedSlabLabel,
                      line.hrStatus ? HR_LABELS[line.hrStatus] : '',
                      line.incentiveBdt,
                      line.attendanceBonusBdt,
                      line.specialBonusBdt,
                      line.totalPayBdt,
                    ]),
                  )
                }
              >
                <Download className="size-4" />
                Snapshot CSV
              </Button>
              {canManage &&
              selectedPeriod &&
              (selectedPeriod.status === 'approved' || selectedPeriod.status === 'paid') ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handlePayrollExport()}
                >
                  <Download className="size-4" />
                  Payroll CSV
                </Button>
              ) : null}
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
                    <span>Calculated {formatDateTime(selectedPeriod.calculatedAt)}</span>
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
                        <TableHead>HR</TableHead>
                        <TableHead className="text-right">Incentive</TableHead>
                        <TableHead className="text-right">Attendance</TableHead>
                        <TableHead className="text-right">Special</TableHead>
                        <TableHead className="text-right">Total pay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visiblePayoutLines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="font-medium">{line.agentName}</TableCell>
                          <TableCell>{line.planName}</TableCell>
                          <TableCell className="text-right">{line.actualValue}</TableCell>
                          <TableCell>{line.matchedSlabLabel ?? '—'}</TableCell>
                          <TableCell>
                            {line.hrStatus ? (
                              <Badge
                                variant={
                                  line.hrStatus === 'terminated'
                                    ? 'destructive'
                                    : line.hrStatus === 'active'
                                      ? 'success'
                                      : 'secondary'
                                }
                              >
                                {HR_LABELS[line.hrStatus]}
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(line.incentiveBdt)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(line.attendanceBonusBdt ?? 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(line.specialBonusBdt ?? 0)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(
                              line.totalPayBdt ??
                                line.incentiveBdt +
                                  (line.attendanceBonusBdt ?? 0) +
                                  (line.specialBonusBdt ?? 0),
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={8} className="font-medium">Total</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(
                            selectedPeriod.totalPayBdt ?? selectedPeriod.totalIncentiveBdt,
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog
        open={teamOpen}
        onOpenChange={(open) => {
          setTeamOpen(open);
          if (!open) {
            setEditingTeam(null);
            setTeamName('');
            setTeamActive(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit team' : 'New team'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="incentive-team-name">Name</Label>
              <Input
                id="incentive-team-name"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="e.g. Telesales"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={teamActive}
                onChange={(event) => setTeamActive(event.target.checked)}
              />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTeamOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={() => void handleSaveTeam()}>
              {editingTeam ? 'Save' : 'Create'}
            </Button>
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
        initial={editingAssignment}
        plans={data?.plans ?? []}
        onClose={() => {
          setAssignOpen(false);
          setEditingAssignment(null);
        }}
        onSaved={() => void load()}
      />
      <SalaryFormDialog
        open={salaryOpen}
        initial={data?.salaryTemplate}
        onClose={() => setSalaryOpen(false)}
        onSaved={() => void load()}
      />
      {confirmDialog}
    </PageShell>
  );
}

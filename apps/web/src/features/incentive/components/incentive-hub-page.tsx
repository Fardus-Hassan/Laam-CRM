'use client';

import * as React from 'react';
import Link from 'next/link';
import type {
  IncentiveDailyPoint,
  IncentiveMetricType,
  IncentiveOverview,
  IncentivePerformanceReport,
  IncentivePlan,
  IncentiveTeam,
} from '@laam/types';
import {
  Edit2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Unlock,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DateRange } from 'react-day-picker';

import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
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
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { incentiveApi } from '@/features/incentive/api/incentive-api';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { PlanFormDialog } from '@/features/incentive/components/plan-form-dialog';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { ExportMenu } from '@/components/export-menu';
import { DateRangePicker } from '@/components/date-range/date-range-picker';
import { rangeFromISO, toISODateRange } from '@/lib/date-range';
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

function currentYearMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function isoToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthWindow(yearMonth: string): { from: string; to: string } {
  const [year, month] = yearMonth.split('-').map(Number);
  const last = new Date(year, month, 0).getDate();
  const from = `${yearMonth}-01`;
  const monthEnd = `${yearMonth}-${String(last).padStart(2, '0')}`;
  const today = isoToday();
  return { from, to: monthEnd < today ? monthEnd : today };
}

function formatMetricValue(metricType: IncentiveMetricType, value: number) {
  return metricType === 'return_ratio' ? `${value}%` : String(value);
}

type HubTab = 'teams' | 'structure' | 'performance';
type PeriodMode = 'month' | 'range';

const FILTER_METRICS: Array<{ value: IncentiveMetricType; label: string }> = [
  { value: 'order_count', label: 'Order count' },
  { value: 'cross_sell_count', label: 'Cross-sell / upsell' },
  { value: 'return_ratio', label: 'Return ratio %' },
];

export function IncentiveHubPage() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const { can } = usePermissions();
  const { user } = useAuth();
  const canManage = can('incentive.manage');
  const [data, setData] = React.useState<IncentiveOverview | null>(null);
  const [performance, setPerformance] = React.useState<IncentivePerformanceReport | null>(null);
  const [yearMonth, setYearMonth] = React.useState(currentYearMonth);
  const [periodMode, setPeriodMode] = React.useState<PeriodMode>('month');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [tab, setTab] = React.useState<HubTab>(
    canManage || user?.role === 'team_leader' ? 'teams' : 'performance',
  );
  const [selectedTeamId, setSelectedTeamId] = React.useState('');
  const [selectedMemberId, setSelectedMemberId] = React.useState('');
  const [selectedMetric, setSelectedMetric] = React.useState<IncentiveMetricType | ''>('');
  const [lockedTeamId, setLockedTeamId] = React.useState<string | undefined>();
  const [planOpen, setPlanOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<IncentivePlan | null>(null);
  const [manualDrafts, setManualDrafts] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [overview, report] = await Promise.all([
        incentiveApi.getOverview(),
        incentiveApi.getPerformance(
          periodMode === 'range' && dateFrom && dateTo
            ? { yearMonth, from: dateFrom, to: dateTo }
            : { yearMonth },
        ),
      ]);
      setData(overview);
      setPerformance(report);
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
  }, [yearMonth, periodMode, dateFrom, dateTo]);

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

  function openStructureForTeam(team: IncentiveTeam, create = false) {
    setSelectedTeamId(team.id);
    setLockedTeamId(team.id);
    const plansForTeam = (data?.plans ?? []).filter(
      (row) => row.teamId === team.id || row.id === team.planId,
    );
    const plan = plansForTeam[0] ?? null;
    setEditingPlan(create ? null : plan);
    setTab('structure');
    if (canManage && (create || !team.hasStructure)) setPlanOpen(true);
  }

  function openPerformanceForTeam(team: IncentiveTeam) {
    setSelectedTeamId(team.id);
    setTab('performance');
  }

  async function handleDeletePlan(plan: IncentivePlan) {
    const ok = await confirm({
      title: `Archive “${plan.name}”?`,
      description:
        'History stays. The metric slot frees so you can add a new structure for this team.',
      confirmLabel: 'Archive',
      destructive: true,
    });
    if (!ok) return;
    await runAction(() => incentiveApi.deletePlan(plan.id), 'KPI structure archived');
  }

  async function handleRestorePlan(plan: IncentivePlan) {
    await runAction(
      () => incentiveApi.updatePlan(plan.id, { isActive: true }),
      'KPI structure restored',
    );
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

  const empty = !loading && (data?.teamCount ?? 0) === 0;
  const isTeamLead = user?.role === 'team_leader';
  const selfOnly = !canManage && !isTeamLead;
  const currentUserName = user?.name.trim().toLocaleLowerCase() ?? '';
  const currentUserId = user?.id ?? '';

  function isOwnAgent(row: {
    assignmentId?: string | null;
    userId?: string | null;
    agentName: string;
  }) {
    if (!selfOnly) return true;
    if (row.userId && currentUserId && row.userId === currentUserId) return true;
    const assignment = (data?.assignments ?? []).find(
      (item) => item.id === row.assignmentId,
    );
    if (assignment?.userId && currentUserId && assignment.userId === currentUserId) {
      return true;
    }
    return row.agentName.trim().toLocaleLowerCase() === currentUserName;
  }

  const visiblePerformanceLines = (performance?.lines ?? []).filter((line) => {
    if (!isOwnAgent(line)) return false;
    if (selectedMemberId && line.assignmentId !== selectedMemberId) return false;
    if (selectedMetric && line.metricType !== selectedMetric) return false;
    if (!selectedTeamId) return true;
    if (line.orgTeamId === selectedTeamId) return true;
    const plan = (data?.plans ?? []).find((row) => row.id === line.planId);
    if (plan?.teamId === selectedTeamId) return true;
    const team = (data?.teams ?? []).find((row) => row.id === selectedTeamId);
    return Boolean(team && line.teamName === team.name);
  });
  const visibleRollups = (performance?.teamRollups ?? []).filter((rollup) => {
    if (!selectedTeamId) return true;
    if (rollup.orgTeamId === selectedTeamId) return true;
    const plan = (data?.plans ?? []).find((row) => row.id === rollup.planId);
    if (plan?.teamId === selectedTeamId) return true;
    const team = (data?.teams ?? []).find((row) => row.id === selectedTeamId);
    return Boolean(team && rollup.teamName === team.name);
  });
  const selectedTeam = (data?.teams ?? []).find((row) => row.id === selectedTeamId);
  const structurePlans = (data?.plans ?? []).filter((plan) => {
    if (!selectedTeamId) return true;
    return plan.teamId === selectedTeamId || plan.id === selectedTeam?.planId;
  });
  const monthLocked =
    performance?.periodStatus === 'approved' || performance?.periodStatus === 'paid';
  const memberOptions = (data?.assignments ?? []).filter((assignment) => {
    if (!selectedTeamId) return true;
    const plan = (data?.plans ?? []).find((row) => row.id === assignment.planId);
    return plan?.teamId === selectedTeamId || assignment.teamName === selectedTeam?.name;
  });
  const visibleDaily = (performance?.daily ?? []).filter((point) => {
    if (!isOwnAgent(point)) return false;
    if (selectedMemberId && point.assignmentId !== selectedMemberId) return false;
    if (selectedMetric && point.metricType !== selectedMetric) return false;
    if (!selectedTeamId) return true;
    if (point.orgTeamId === selectedTeamId) return true;
    const plan = (data?.plans ?? []).find((row) => row.id === point.planId);
    if (plan?.teamId === selectedTeamId) return true;
    const team = (data?.teams ?? []).find((row) => row.id === selectedTeamId);
    return Boolean(team && point.teamName === team.name);
  });
  const rangeMode = periodMode === 'range' && Boolean(dateFrom && dateTo);
  const dailyByDate = React.useMemo(() => {
    const grouped = new Map<string, IncentiveDailyPoint[]>();
    for (const point of visibleDaily) {
      const rows = grouped.get(point.date) ?? [];
      rows.push(point);
      grouped.set(point.date, rows);
    }
    return [...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [visibleDaily]);

  function clearPerformanceFilters() {
    setSelectedTeamId('');
    setSelectedMemberId('');
    setSelectedMetric('');
    setPeriodMode('month');
    setDateFrom('');
    setDateTo('');
    setYearMonth(currentYearMonth());
  }

  function applyDateRange(range: DateRange | undefined) {
    const iso = toISODateRange(range);
    if (!iso) return;
    setDateFrom(iso.from);
    setDateTo(iso.to);
    setYearMonth(iso.to.slice(0, 7));
    setPeriodMode('range');
  }

  return (
    <PageShell
      title="Incentive & KPI"
      description={
        canManage
          ? 'KPI structure and live performance for Users-page teams. Filter by team, member, month, or date range.'
          : 'Your monthly target and live progress. Filter by month or date range.'
      }
    >
      <div className={cn('flex flex-col', ORDER_PAGE_GAP)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1 border-b pb-2">
            {(
              (
                canManage
                  ? ([
                      ['teams', 'Teams'],
                      ['structure', 'Structure'],
                      ['performance', 'Performance'],
                    ] as const)
                  : ([
                      ['teams', 'My team'],
                      ['structure', 'My structure'],
                      ['performance', 'My performance'],
                    ] as const)
              )
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
                <Button type="button" size="sm" variant="outline" asChild>
                  <Link href="/dashboard/users?view=team">Create teams in Users</Link>
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
                    'Users team members synced to KPI',
                  )
                }
              >
                <RefreshCw className="size-4" />
                Sync members
              </Button>
            </div>
          ) : null}
        </div>

        <CrmSummaryStrip
          items={[
            { id: 'teams', label: 'Users teams', value: String(data?.teamCount ?? '—') },
            { id: 'plans', label: 'KPI structures', value: String(data?.planCount ?? '—') },
            { id: 'assignments', label: 'Agents on KPI', value: String(data?.assignmentCount ?? '—') },
            {
              id: 'estimate',
              label: 'Incentive estimate',
              value: performance ? formatCurrency(performance.totalIncentiveBdt) : '—',
            },
          ]}
        />

        {tab === 'teams' ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-base">Users teams</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Teams come from the Users page. Set KPI structure here, then view performance.
              </p>
            </CardHeader>
            <CardContent className={ORDER_SECTION_BODY_CLASS}>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : empty ? (
                <p className="text-sm text-muted-foreground">
                  No teams yet.{' '}
                  <Link className="underline" href="/dashboard/users?view=team">
                    Create teams in Users
                  </Link>
                  .
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>KPI structure</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.teams ?? []).map((team) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>{team.memberCount ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(team.metricTypes ?? []).length ? (
                              (team.metricTypes ?? []).map((metric) => (
                                <Badge key={metric} variant="success">
                                  {METRIC_LABELS[metric]}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="secondary">Not set</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {canManage ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openStructureForTeam(team)}
                              >
                                Structure
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => openPerformanceForTeam(team)}
                            >
                              Performance
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : null}

        {tab === 'performance' ? (
          <div className="space-y-3">
            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-base">Filters</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Team, member, metric, and month or a custom date range. Daily rows show what happened on each date; month totals stay below.
                  {monthLocked && !rangeMode
                    ? ' This month is locked — member totals are the snapshot.'
                    : monthLocked && rangeMode
                      ? ' Month is locked; date-range rows are still live.'
                      : ''}
                </p>
                {canManage && periodMode === 'month' ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {performance?.periodStatus === 'paid' ? (
                      <Badge variant="secondary">Month closed</Badge>
                    ) : monthLocked ? (
                      <>
                        <Badge variant="success">Month locked</Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            void runAction(
                              () => incentiveApi.unlockMonth(yearMonth),
                              'Month unlocked — totals are live again',
                            )
                          }
                        >
                          <Unlock className="size-4" />
                          Unlock
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void runAction(
                            () => incentiveApi.lockMonth(yearMonth),
                            'Month locked',
                          )
                        }
                      >
                        <Lock className="size-4" />
                        Lock month
                      </Button>
                    )}
                  </div>
                ) : null}
              </CardHeader>
              <CardContent
                className={cn(
                  ORDER_SECTION_BODY_CLASS,
                  'grid gap-2 sm:grid-cols-2 lg:grid-cols-6',
                )}
              >
                <FormSearchSelect
                  portal
                  searchable={false}
                  value={periodMode}
                  onChange={(next) => {
                    const mode = next as PeriodMode;
                    setPeriodMode(mode);
                    if (mode === 'range') {
                      const window = monthWindow(yearMonth);
                      setDateFrom(window.from);
                      setDateTo(window.to);
                    } else {
                      setDateFrom('');
                      setDateTo('');
                    }
                  }}
                  options={[
                    { value: 'month', label: 'By month' },
                    { value: 'range', label: 'Date range' },
                  ]}
                />
                {periodMode === 'month' ? (
                  <Input
                    type="month"
                    value={yearMonth}
                    onChange={(event) => setYearMonth(event.target.value)}
                  />
                ) : (
                  <DateRangePicker
                    className="w-full"
                    allowAllTime={false}
                    value={rangeFromISO(dateFrom, dateTo)}
                    onChange={applyDateRange}
                    placeholder="Pick dates"
                  />
                )}
                <FormSearchSelect
                  portal
                  value={selectedTeamId}
                  onChange={(teamId) => {
                    setSelectedTeamId(teamId);
                    setSelectedMemberId('');
                  }}
                  options={[
                    { value: '', label: 'All teams' },
                    ...(data?.teams ?? []).map((team) => ({
                      value: team.id,
                      label: team.name,
                    })),
                  ]}
                  placeholder="All teams"
                />
                <FormSearchSelect
                  portal
                  value={selectedMemberId}
                  onChange={setSelectedMemberId}
                  options={[
                    { value: '', label: 'All members' },
                    ...memberOptions.map((assignment) => ({
                      value: assignment.id,
                      label: assignment.agentName,
                    })),
                  ]}
                  placeholder={memberOptions.length ? 'All members' : 'No members'}
                />
                <FormSearchSelect
                  portal
                  searchable={false}
                  value={selectedMetric}
                  onChange={(metric) =>
                    setSelectedMetric(metric as IncentiveMetricType | '')
                  }
                  options={[
                    { value: '', label: 'All metrics' },
                    ...FILTER_METRICS,
                  ]}
                  placeholder="All metrics"
                />
                <Button type="button" variant="outline" onClick={clearPerformanceFilters}>
                  Clear filters
                </Button>
              </CardContent>
            </Card>

            {visibleRollups.length ? (
              <Card className={ORDER_CARD_CLASS}>
                <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                  <CardTitle className="text-base">
                    Overall {yearMonth} · team progress
                  </CardTitle>
                </CardHeader>
                <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'grid gap-2 sm:grid-cols-2 lg:grid-cols-3')}>
                  {visibleRollups.map((rollup) => (
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
                <div className="flex-1">
                  <CardTitle className="text-base">Daily progress</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {rangeMode
                      ? `${dateFrom} → ${dateTo}`
                      : `Each day in ${yearMonth} with counted activity`}
                  </p>
                </div>
                <ExportMenu
                  filename={`incentive-daily-${performance?.periodStart ?? yearMonth}`}
                  headers={['Date', 'Team', 'Member', 'Metric', 'Actual', 'Daily target']}
                  rows={visibleDaily.map((point) => [
                    point.date,
                    point.teamName ?? '',
                    point.agentName,
                    METRIC_LABELS[point.metricType],
                    point.actualValue,
                    point.dailyTarget ?? '',
                  ])}
                />
              </CardHeader>
              <CardContent className={ORDER_SECTION_BODY_CLASS}>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : !dailyByDate.length ? (
                  <p className="text-sm text-muted-foreground">
                    No daily activity in this filter. Order confirm, CS/US, and return events show up here.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Metric</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Daily target</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyByDate.flatMap(([date, points]) =>
                        points.map((point, index) => (
                          <TableRow key={`${point.assignmentId}-${point.date}-${index}`}>
                            <TableCell className="tabular-nums">{index === 0 ? date : ''}</TableCell>
                            <TableCell>{point.teamName ?? '—'}</TableCell>
                            <TableCell className="font-medium">{point.agentName}</TableCell>
                            <TableCell>{METRIC_LABELS[point.metricType]}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMetricValue(point.metricType, point.actualValue)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {point.dailyTarget ?? '—'}
                            </TableCell>
                          </TableRow>
                        )),
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex flex-row items-center gap-3')}>
                <CardTitle className="flex-1 text-base">
                  {rangeMode ? `Members · ${yearMonth} month vs selected dates` : `Members · ${yearMonth}`}
                </CardTitle>
                <ExportMenu
                  filename={`incentive-performance-${yearMonth}`}
                  headers={[
                    'Agent',
                    'Plan',
                    'Metric',
                    ...(rangeMode ? ['In range'] : []),
                    'Month actual',
                    'Slab',
                    'Incentive',
                  ]}
                  rows={visiblePerformanceLines.map((line) => [
                    line.agentName,
                    line.planName,
                    METRIC_LABELS[line.metricType],
                    ...(rangeMode ? [line.rangeActualValue ?? ''] : []),
                    line.actualValue,
                    line.matchedSlabLabel,
                    line.incentiveBdt,
                  ])}
                />
              </CardHeader>
              <CardContent className={ORDER_SECTION_BODY_CLASS}>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : !visiblePerformanceLines.length ? (
                  <p className="text-sm text-muted-foreground">No matching agents for this filter.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Plan</TableHead>
                        {rangeMode ? <TableHead>In range</TableHead> : null}
                        <TableHead>Month actual</TableHead>
                        <TableHead>Slab</TableHead>
                        <TableHead className="text-right">Incentive</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visiblePerformanceLines.map((line) => (
                        <TableRow key={line.assignmentId}>
                          <TableCell>
                            <p className="font-medium">{line.agentName}</p>
                          </TableCell>
                          <TableCell>
                            <div>{line.planName}</div>
                            <div className="text-xs text-muted-foreground">
                              {line.teamName ?? 'No team'} · {METRIC_LABELS[line.metricType]}
                            </div>
                          </TableCell>
                          {rangeMode ? (
                            <TableCell className="tabular-nums">
                              {formatMetricValue(
                                line.metricType,
                                line.rangeActualValue ?? 0,
                              )}
                            </TableCell>
                          ) : null}
                          <TableCell>
                            {line.metricType === 'manual' && canManage ? (
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
                                {formatMetricValue(line.metricType, line.actualValue)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {line.matchedSlabLabel ?? '—'}
                            {line.prorataApplied ? <Badge className="ml-2" variant="secondary">prorata</Badge> : null}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
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

        {tab === 'structure' ? (
          <div className="space-y-3">
            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex flex-row flex-wrap items-center gap-2')}>
                <div className="flex-1">
                  <CardTitle className="text-base">KPI structure</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Metric, daily/monthly targets, and incentive slabs for one Users team.
                  </p>
                </div>
                <FormSearchSelect
                  portal
                  className="w-56"
                  value={selectedTeamId}
                  onChange={(teamId) => {
                    setSelectedTeamId(teamId);
                    setLockedTeamId(teamId || undefined);
                  }}
                  options={[
                    { value: '', label: 'All teams' },
                    ...(data?.teams ?? []).map((team) => ({
                      value: team.id,
                      label: team.name,
                    })),
                  ]}
                  placeholder="All teams"
                />
                {canManage && selectedTeam && !(selectedTeam.metricTypes ?? []).length ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openStructureForTeam(selectedTeam, true)}
                  >
                    <Plus className="size-4" />
                    Set structure
                  </Button>
                ) : null}
                {canManage &&
                selectedTeam &&
                FILTER_METRICS.some(
                  (metric) => !(selectedTeam.metricTypes ?? []).includes(metric.value),
                ) &&
                (selectedTeam.metricTypes ?? []).length > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openStructureForTeam(selectedTeam, true)}
                  >
                    <Plus className="size-4" />
                    Add metric
                  </Button>
                ) : null}
              </CardHeader>
            </Card>
            {!structurePlans.length ? (
              <p className="text-sm text-muted-foreground">
                {selectedTeam
                  ? 'No KPI structure for this team yet. Set metric and slabs.'
                  : 'Select a Users team, then set metric and slabs.'}
              </p>
            ) : (
              structurePlans.map((plan) => (
              <Card key={plan.id} className={ORDER_CARD_CLASS}>
                <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex flex-row items-start justify-between gap-2')}>
                  <div>
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan.teamName ?? 'No team'} · {METRIC_LABELS[plan.metricType]}
                      {plan.teamMonthlyTarget != null ? ` · team target ${plan.teamMonthlyTarget}` : ''}
                      {plan.isActive ? '' : ' · archived'}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex gap-1">
                      {plan.isActive ? (
                        <>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setLockedTeamId(plan.teamId ?? undefined);
                              setSelectedTeamId(plan.teamId ?? '');
                              setEditingPlan(plan);
                              setPlanOpen(true);
                            }}
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" onClick={() => void handleDeletePlan(plan)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleRestorePlan(plan)}
                        >
                          Restore
                        </Button>
                      )}
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
              ))
            )}
          </div>
        ) : null}
      </div>

      <PlanFormDialog
        open={planOpen}
        initial={editingPlan}
        teams={data?.teams ?? []}
        lockedTeamId={lockedTeamId}
        occupiedMetrics={(data?.plans ?? [])
          .filter(
            (plan) =>
              plan.isActive &&
              plan.teamId === (lockedTeamId || selectedTeamId) &&
              plan.id !== editingPlan?.id,
          )
          .map((plan) => plan.metricType)}
        onClose={() => {
          setPlanOpen(false);
          setLockedTeamId(selectedTeamId || undefined);
        }}
        onSaved={() => void load()}
      />
      {confirmDialog}
    </PageShell>
  );
}

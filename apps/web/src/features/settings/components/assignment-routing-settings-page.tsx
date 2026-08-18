'use client';

import * as React from 'react';
import type { OrgRoutingConfig, OrgRoutingMode, OrgTeam, TenantUser } from '@laam/types';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ordersApi } from '@/features/orders/api/orders-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_GRID_GAP,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { rbacApi } from '@/features/rbac/api/rbac-api';
import { cn } from '@/lib/utils';

type RuleDraft = {
  mode: OrgRoutingMode;
  teamIds: string[];
  assigneeUserId: string;
};

const MODE_OPTIONS = [
  { value: 'auto_split', label: 'Auto split selected teams' },
  { value: 'specific_member', label: 'Assign specific member' },
];

function usersInTeams(users: TenantUser[], teams: OrgTeam[], teamIds: string[]): TenantUser[] {
  if (!teamIds.length) return [];
  const ids = new Set<string>();
  for (const team of teams) {
    if (!teamIds.includes(team.id)) continue;
    ids.add(team.leaderUserId);
    for (const memberId of team.memberUserIds ?? []) ids.add(memberId);
  }
  return users.filter(
    (user) => ids.has(user.id) || (user.teamId != null && teamIds.includes(user.teamId)),
  );
}

function RoutingRuleCard({
  title,
  hint,
  value,
  teams,
  users,
  onChange,
}: {
  title: string;
  hint: string;
  value: RuleDraft;
  teams: OrgTeam[];
  users: TenantUser[];
  onChange: (next: RuleDraft) => void;
}) {
  const memberOptions = React.useMemo(() => {
    const pool =
      value.teamIds.length > 0 ? usersInTeams(users, teams, value.teamIds) : users;
    return pool.map((user) => ({
      value: user.id,
      label: user.email ? `${user.name} · ${user.email}` : user.name,
    }));
  }, [teams, users, value.teamIds]);

  return (
    <Card className={ORDER_CARD_CLASS}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardHeader>
      <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'grid gap-3', ORDER_SECTION_GRID_GAP)}>
        <FormField label="Mode">
          <FormSearchSelect
            portal
            searchable={false}
            value={value.mode}
            onChange={(mode) =>
              onChange({
                ...value,
                mode: mode === 'specific_member' ? 'specific_member' : 'auto_split',
                assigneeUserId: mode === 'specific_member' ? value.assigneeUserId : '',
              })
            }
            options={MODE_OPTIONS}
          />
        </FormField>
        <FormField
          label="Team pool"
          hint="Website ingest uses this pool. Manual CRM orders default to the creator unless overridden on Create Order."
        >
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
            {teams.map((team) => {
              const checked = value.teamIds.includes(team.id);
              return (
                <label
                  key={team.id}
                  className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={checked}
                    onChange={() =>
                      onChange({
                        ...value,
                        teamIds: checked
                          ? value.teamIds.filter((id) => id !== team.id)
                          : [...value.teamIds, team.id],
                      })
                    }
                  />
                  <span>{team.name}</span>
                </label>
              );
            })}
            {teams.length === 0 ? (
              <p className="text-xs text-muted-foreground">No teams. Create them on the Users page.</p>
            ) : null}
          </div>
        </FormField>
        {value.mode === 'specific_member' ? (
          <FormField label="Default member">
            <FormSearchSelect
              portal
              value={value.assigneeUserId}
              onChange={(assigneeUserId) => onChange({ ...value, assigneeUserId })}
              options={memberOptions}
              placeholder={memberOptions.length ? 'Search member' : 'No members'}
            />
          </FormField>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AssignmentRoutingSettingsPage() {
  const [teams, setTeams] = React.useState<OrgTeam[]>([]);
  const [users, setUsers] = React.useState<TenantUser[]>([]);
  const [orderRouting, setOrderRouting] = React.useState<RuleDraft>({
    mode: 'auto_split',
    teamIds: [],
    assigneeUserId: '',
  });
  const [courierRouting, setCourierRouting] = React.useState<RuleDraft>({
    mode: 'auto_split',
    teamIds: [],
    assigneeUserId: '',
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([rbacApi.listTeams(''), rbacApi.listUsers(''), ordersApi.getRoutingConfig()])
      .then(([orgTeams, orgUsers, cfg]) => {
        if (cancelled) return;
        setTeams(orgTeams);
        setUsers(orgUsers.filter((user) => user.status === 'active'));
        setOrderRouting({
          mode: cfg.orderRouting.mode,
          teamIds: cfg.orderRouting.teamIds ?? [],
          assigneeUserId: cfg.orderRouting.assigneeUserId ?? '',
        });
        setCourierRouting({
          mode: cfg.courierRouting.mode,
          teamIds: cfg.courierRouting.teamIds ?? [],
          assigneeUserId: cfg.courierRouting.assigneeUserId ?? '',
        });
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Could not load routing');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (orderRouting.mode === 'auto_split' && orderRouting.teamIds.length === 0) {
      toast.error('Select at least one sales team for auto split');
      return;
    }
    if (orderRouting.mode === 'specific_member' && !orderRouting.assigneeUserId) {
      toast.error('Select a default sales member');
      return;
    }
    if (courierRouting.mode === 'auto_split' && courierRouting.teamIds.length === 0) {
      toast.error('Select at least one logistic team for auto split');
      return;
    }
    if (courierRouting.mode === 'specific_member' && !courierRouting.assigneeUserId) {
      toast.error('Select a default logistic member');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<OrgRoutingConfig> = {
        orderRouting: {
          mode: orderRouting.mode,
          teamIds: orderRouting.teamIds,
          assigneeUserId:
            orderRouting.mode === 'specific_member' ? orderRouting.assigneeUserId : undefined,
        },
        courierRouting: {
          mode: courierRouting.mode,
          teamIds: courierRouting.teamIds,
          assigneeUserId:
            courierRouting.mode === 'specific_member' ? courierRouting.assigneeUserId : undefined,
        },
      };
      const saved = await ordersApi.updateRoutingConfig(payload);
      setOrderRouting({
        mode: saved.orderRouting.mode,
        teamIds: saved.orderRouting.teamIds ?? [],
        assigneeUserId: saved.orderRouting.assigneeUserId ?? '',
      });
      setCourierRouting({
        mode: saved.courierRouting.mode,
        teamIds: saved.courierRouting.teamIds ?? [],
        assigneeUserId: saved.courierRouting.assigneeUserId ?? '',
      });
      toast.success('Assignment routing saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save routing');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Assignment routing"
      description="Default sales assignment for website ingest and logistic assignment at courier booking."
      breadcrumbs={[
        { label: 'Settings', href: '/dashboard/settings' },
        { label: 'Assignment routing' },
      ]}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className={ORDER_PAGE_GAP}>
          <RoutingRuleCard
            title="Sales (order KPI)"
            hint="Who gets website / ecommerce orders at ingest. Confirm later freezes this person for order count and CS/US."
            value={orderRouting}
            teams={teams}
            users={users}
            onChange={setOrderRouting}
          />
          <RoutingRuleCard
            title="Logistic (courier KPI)"
            hint="Who gets the order at Pathao/Carrybee book. Return ratio uses this person, not sales."
            value={courierRouting}
            teams={teams}
            users={users}
            onChange={setCourierRouting}
          />
          <Can permission={['settings.manage', 'orders.assign']}>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              <Save className="size-4" />
              {saving ? 'Saving…' : 'Save routing'}
            </Button>
          </Can>
        </div>
      )}
    </PageShell>
  );
}

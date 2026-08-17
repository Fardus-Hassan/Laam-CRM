'use client';

import * as React from 'react';
import type { OrgTeam, TenantUser } from '@laam/types';

import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_GRID_GAP,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import type { CreateOrderFormApi } from '@/features/orders/hooks/use-create-order-form';
import { ordersApi } from '@/features/orders/api/orders-api';
import { rbacApi } from '@/features/rbac/api/rbac-api';
import { cn } from '@/lib/utils';

type CreateOrderAssignmentSectionProps = {
  form: CreateOrderFormApi;
};

type SalesAssignMode = '' | 'auto_split' | 'specific_member';

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

export function CreateOrderAssignmentSection({ form }: CreateOrderAssignmentSectionProps) {
  const { state, patch } = form;
  const [teams, setTeams] = React.useState<OrgTeam[]>([]);
  const [users, setUsers] = React.useState<TenantUser[]>([]);
  const [defaultHint, setDefaultHint] = React.useState('Uses organization sales routing.');

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([rbacApi.listTeams(''), rbacApi.listUsers(''), ordersApi.getRoutingConfig()])
      .then(([orgTeams, orgUsers, cfg]) => {
        if (cancelled) return;
        setTeams(orgTeams);
        setUsers(orgUsers.filter((user) => user.status === 'active'));
        const mode = cfg.orderRouting.mode === 'specific_member' ? 'specific member' : 'auto split';
        const teamCount = cfg.orderRouting.teamIds.length;
        setDefaultHint(
          teamCount
            ? `Uses organization sales routing (${mode}, ${teamCount} team${teamCount === 1 ? '' : 's'}).`
            : `Uses organization sales routing (${mode}). Set teams in Settings if this should round-robin.`,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setTeams([]);
          setUsers([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const memberOptions = React.useMemo(() => {
    const pool =
      state.salesTeamIds.length > 0 ? usersInTeams(users, teams, state.salesTeamIds) : users;
    return pool.map((user) => ({
      value: user.id,
      label: user.email ? `${user.name} · ${user.email}` : user.name,
    }));
  }, [state.salesTeamIds, teams, users]);

  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">Sales assignment</CardTitle>
      </CardHeader>
      <CardContent className={cn('grid', ORDER_SECTION_BODY_CLASS, ORDER_SECTION_GRID_GAP)}>
        <p className="col-span-full text-xs text-muted-foreground">
          Sales KPI credit follows this assignee. Courier / logistic assignment is set later at booking.
          Organization default is configured in Settings → Assignment routing.
        </p>
        <div className={cn('col-span-full grid sm:grid-cols-2 lg:grid-cols-3', ORDER_SECTION_GRID_GAP)}>
          <FormField label="Routing" hint={state.salesAssignMode === '' ? defaultHint : undefined}>
            <FormSearchSelect
              portal
              searchable={false}
              value={state.salesAssignMode}
              onChange={(next) => {
                const mode = next as SalesAssignMode;
                patch({
                  salesAssignMode: mode,
                  salesUserId: mode === 'specific_member' ? state.salesUserId : '',
                });
              }}
              options={[
                { value: '', label: 'Organization default' },
                { value: 'auto_split', label: 'Auto split selected teams' },
                { value: 'specific_member', label: 'Assign specific member' },
              ]}
            />
          </FormField>

          {state.salesAssignMode === 'auto_split' || state.salesAssignMode === 'specific_member' ? (
            <FormField
              label="Team pool"
              className="sm:col-span-2"
              hint={
                state.salesAssignMode === 'auto_split'
                  ? 'Orders round-robin across members of the selected teams.'
                  : 'Optional. Narrows the member list to these teams.'
              }
            >
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                {teams.map((team) => {
                  const checked = state.salesTeamIds.includes(team.id);
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
                          patch({
                            salesTeamIds: checked
                              ? state.salesTeamIds.filter((id) => id !== team.id)
                              : [...state.salesTeamIds, team.id],
                            salesUserId:
                              checked &&
                              state.salesUserId &&
                              !usersInTeams(
                                users,
                                teams,
                                state.salesTeamIds.filter((id) => id !== team.id),
                              ).some((user) => user.id === state.salesUserId)
                                ? ''
                                : state.salesUserId,
                          })
                        }
                      />
                      <span>{team.name}</span>
                    </label>
                  );
                })}
                {teams.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No teams found. Create them on the Users page.</p>
                ) : null}
              </div>
            </FormField>
          ) : null}

          {state.salesAssignMode === 'specific_member' ? (
            <FormField label="Member" className="lg:col-span-1">
              <FormSearchSelect
                portal
                value={state.salesUserId}
                onChange={(salesUserId) => patch({ salesUserId })}
                options={memberOptions}
                placeholder={memberOptions.length ? 'Search member' : 'No members'}
              />
            </FormField>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import * as React from 'react';
import type { OrgTeam, TenantUser } from '@laam/types';
import { ROLE_LABELS } from '@laam/types';
import { Plus, Trash2, UsersRound } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { rbacApi } from '@/features/rbac/api/rbac-api';
import {
  ORDER_CARD_CLASS,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

type TeamsAdminPanelProps = {
  organizationId: string;
  users: TenantUser[];
  teams: OrgTeam[];
  onChanged: () => Promise<void>;
};

export function TeamsAdminPanel({
  organizationId,
  users,
  teams,
  onChanged,
}: TeamsAdminPanelProps) {
  const [selectedId, setSelectedId] = React.useState(teams[0]?.id ?? '');
  const [name, setName] = React.useState('');
  const [leaderUserId, setLeaderUserId] = React.useState('');
  const [memberUserIds, setMemberUserIds] = React.useState<string[]>([]);
  const [creating, setCreating] = React.useState(false);

  const selected = teams.find((t) => t.id === selectedId);

  React.useEffect(() => {
    if (selected) {
      setName(selected.name);
      setLeaderUserId(selected.leaderUserId);
      setMemberUserIds([...selected.memberUserIds]);
      setCreating(false);
    } else if (!teams.length) {
      setCreating(true);
      setName('');
      setLeaderUserId('');
      setMemberUserIds([]);
    }
  }, [selected, teams.length]);

  const leaders = users.filter(
    (u) =>
      u.status === 'active' &&
      (u.systemRole === 'team_leader' ||
        u.systemRole === 'sales_rep' ||
        u.systemRole === 'sales_manager' ||
        u.id === selected?.leaderUserId),
  );

  const agentCandidates = users.filter(
    (u) =>
      u.status === 'active' &&
      u.id !== leaderUserId &&
      (u.systemRole === 'sales_rep' ||
        u.systemRole === 'team_leader' ||
        memberUserIds.includes(u.id)),
  );

  function userName(id: string) {
    return users.find((u) => u.id === id)?.name ?? id.slice(0, 8);
  }

  function toggleMember(id: string) {
    setMemberUserIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  async function handleSave() {
    if (!name.trim() || !leaderUserId) {
      toast.error('Team name and leader are required');
      return;
    }
    try {
      if (creating || !selected) {
        const team = await rbacApi.createTeam(organizationId, {
          name: name.trim(),
          leaderUserId,
          memberUserIds,
        });
        toast.success(`Team “${team.name}” created`);
        await onChanged();
        setSelectedId(team.id);
        setCreating(false);
      } else {
        await rbacApi.updateTeam(organizationId, selected.id, {
          name: name.trim(),
          leaderUserId,
          memberUserIds,
        });
        toast.success('Team updated');
        await onChanged();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save team');
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`Delete team “${selected.name}”?`)) return;
    await rbacApi.deleteTeam(organizationId, selected.id);
    toast.success('Team deleted');
    setSelectedId('');
    await onChanged();
  }

  function startCreate() {
    setCreating(true);
    setSelectedId('');
    setName('');
    setLeaderUserId(leaders[0]?.id ?? '');
    setMemberUserIds([]);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
      <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
        <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex-row items-center justify-between')}>
          <div className="flex items-center gap-2">
            <UsersRound className="size-4 text-primary" />
            <CardTitle className="text-sm">Teams</CardTitle>
          </div>
          <Can permission="users.manage">
            <Button type="button" size="sm" variant="outline" onClick={startCreate}>
              <Plus className="size-3.5" />
              New
            </Button>
          </Can>
        </CardHeader>
        <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-1 p-2')}>
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                selectedId === team.id && !creating
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent hover:bg-muted/50',
              )}
              onClick={() => {
                setCreating(false);
                setSelectedId(team.id);
              }}
            >
              <p className="text-sm font-medium">{team.name}</p>
              <p className="text-xs text-muted-foreground">
                Leader: {userName(team.leaderUserId)} · {team.memberUserIds.length} agents
              </p>
            </button>
          ))}
          {!teams.length ? (
            <p className="p-3 text-sm text-muted-foreground">No teams yet. Create one.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">
            {creating ? 'Create team' : selected ? `Edit — ${selected.name}` : 'Team details'}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Admin assigns a team leader (role: Team Leader) and agents under them.
          </p>
        </CardHeader>
        <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4')}>
          {!creating && !selected ? (
            <p className="text-sm text-muted-foreground">Select a team or create a new one.</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Team name</Label>
                <input
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Call Team Alpha"
                />
              </div>

              <div className="space-y-2">
                <Label>Team leader</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={leaderUserId}
                  onChange={(e) => {
                    setLeaderUserId(e.target.value);
                    setMemberUserIds((ids) => ids.filter((id) => id !== e.target.value));
                  }}
                >
                  <option value="">Select leader…</option>
                  {leaders.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({ROLE_LABELS[u.systemRole]})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Saving sets their role to Team Leader (unless they are admin/manager).
                </p>
              </div>

              <div className="space-y-2">
                <Label>Agents under this leader</Label>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {agentCandidates.map((u) => {
                    const checked = memberUserIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMember(u.id)}
                          className="size-4 rounded border"
                        />
                        <span className="min-w-0 flex-1 truncate">{u.name}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {ROLE_LABELS[u.systemRole]}
                        </Badge>
                        {u.teamId && u.teamId !== selectedId ? (
                          <span className="text-[10px] text-amber-600">other team</span>
                        ) : null}
                      </label>
                    );
                  })}
                  {!agentCandidates.length ? (
                    <p className="p-2 text-xs text-muted-foreground">No agents available.</p>
                  ) : null}
                </div>
              </div>

              <Can permission="users.manage">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => void handleSave()}>
                    {creating ? 'Create team' : 'Save team'}
                  </Button>
                  {!creating && selected ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => void handleDelete()}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  ) : null}
                </div>
              </Can>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

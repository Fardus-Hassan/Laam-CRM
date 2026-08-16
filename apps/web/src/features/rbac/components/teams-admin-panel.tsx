'use client';

import * as React from 'react';
import type { OrgTeam, TenantUser } from '@laam/types';
import { ROLE_LABELS } from '@laam/types';
import { Plus, Search, Trash2, UsersRound } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
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
  roles: { id: string; name: string }[];
  onChanged: () => Promise<void>;
};

export function TeamsAdminPanel({
  organizationId,
  users,
  teams,
  roles,
  onChanged,
}: TeamsAdminPanelProps) {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [selectedId, setSelectedId] = React.useState(teams[0]?.id ?? '');
  const [name, setName] = React.useState('');
  const [leaderUserId, setLeaderUserId] = React.useState('');
  const [memberUserIds, setMemberUserIds] = React.useState<string[]>([]);
  const [creating, setCreating] = React.useState(false);
  const [agentQuery, setAgentQuery] = React.useState('');

  const selected = teams.find((t) => t.id === selectedId);

  React.useEffect(() => {
    if (selected) {
      setName(selected.name);
      setLeaderUserId(selected.leaderUserId);
      setMemberUserIds([...selected.memberUserIds]);
      setCreating(false);
      setAgentQuery('');
    } else if (!teams.length) {
      setCreating(true);
      setName('');
      setLeaderUserId('');
      setMemberUserIds([]);
      setAgentQuery('');
    }
  }, [selected, teams.length]);

  const assignableUsers = users.filter(
    (u) => u.status === 'active' || u.status === 'invited',
  );

  const leaders = assignableUsers;

  const agentCandidates = assignableUsers.filter((u) => u.id !== leaderUserId);
  const agentQueryNormalized = agentQuery.trim().toLowerCase();
  const visibleAgents = agentQueryNormalized
    ? agentCandidates.filter((u) => {
        const haystack = `${u.name} ${u.email} ${userRoleLabel(u)}`.toLowerCase();
        return haystack.includes(agentQueryNormalized);
      })
    : agentCandidates;

  function userName(id: string) {
    return users.find((u) => u.id === id)?.name ?? id.slice(0, 8);
  }

  function userRoleLabel(user: TenantUser) {
    if (user.customRoleId) {
      const custom = roles.find((role) => role.id === user.customRoleId);
      if (custom) return custom.name;
    }
    return ROLE_LABELS[user.systemRole] ?? user.systemRole;
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
    const ok = await confirm({
      title: `Delete team “${selected.name}”?`,
      description: 'This team and its assignments will be permanently removed.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
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
    setAgentQuery('');
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
            Pick any user as team leader. Their current role stays the same.
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

              <FormField label="Team leader">
                <FormSearchSelect
                  value={leaderUserId}
                  onChange={(next) => {
                    setLeaderUserId(next);
                    setMemberUserIds((ids) => ids.filter((id) => id !== next));
                  }}
                  placeholder="Select leader…"
                  searchPlaceholder="Search users…"
                  emptyMessage="No users to assign"
                  options={leaders.map((u) => ({
                    value: u.id,
                    label: u.name,
                    description: `${u.email} · ${userRoleLabel(u)}`,
                  }))}
                />
              </FormField>

              <div className="space-y-2">
                <Label>Agents under this leader</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={agentQuery}
                    onChange={(event) => setAgentQuery(event.target.value)}
                    placeholder="Search name, email, or role…"
                    className="h-8 pl-8"
                    aria-label="Search agents"
                  />
                </div>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {visibleAgents.map((u) => {
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
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{u.name}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {u.email}
                          </span>
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {userRoleLabel(u)}
                        </Badge>
                        {u.teamId && u.teamId !== selectedId ? (
                          <span className="text-[10px] text-amber-600">other team</span>
                        ) : null}
                      </label>
                    );
                  })}
                  {!agentCandidates.length ? (
                    <p className="p-2 text-xs text-muted-foreground">No agents available.</p>
                  ) : !visibleAgents.length ? (
                    <p className="p-2 text-xs text-muted-foreground">No matching agents.</p>
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
      {confirmDialog}
    </div>
  );
}

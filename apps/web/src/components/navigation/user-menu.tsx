'use client';

import * as React from 'react';
import { BadgeCheck, ChevronsUpDown, LogOut, Sparkles } from 'lucide-react';
import { USER_ROLES, ROLE_LABELS, type UserRole } from '@laam/types';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function UserMenuDropdownContent() {
  const { user, logout, switchRole, canSwitchRole } = useAuth();

  if (!user) {
    return null;
  }

  const initials = getInitials(user.name);

  return (
    <>
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          <Avatar className="size-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem>
          <Sparkles />
          Upgrade to Pro
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem>
          <BadgeCheck />
          Account
        </DropdownMenuItem>
        {canSwitchRole ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Switch role (demo)</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {USER_ROLES.map((demoRole: UserRole) => (
                <DropdownMenuItem
                  key={demoRole}
                  onClick={() => void switchRole(demoRole)}
                  className={demoRole === user.role ? 'bg-accent' : undefined}
                >
                  {ROLE_LABELS[demoRole]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => void logout()}>
        <LogOut />
        Log out
      </DropdownMenuItem>
    </>
  );
}

const TopBarUserTrigger = React.forwardRef<
  HTMLButtonElement,
  {
    initials: string;
    name: string;
    roleLabel: string | null;
  }
>(function TopBarUserTrigger({ initials, name, roleLabel, ...props }, ref) {
  return (
    <Button
      ref={ref}
      variant="ghost"
      className="h-auto max-w-[220px] gap-2 rounded-lg px-2 py-1.5"
      {...props}
    >
      <Avatar className="size-9 shrink-0">
        <AvatarFallback className="bg-primary text-xs text-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="hidden min-w-0 text-left sm:grid">
        <span className="truncate text-sm font-semibold">{name}</span>
        <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
      </div>
      <ChevronsUpDown className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
    </Button>
  );
});

const SidebarUserTrigger = React.forwardRef<
  HTMLButtonElement,
  {
    initials: string;
    name: string;
    roleLabel: string | null;
  }
>(function SidebarUserTrigger({ initials, name, roleLabel, ...props }, ref) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <SidebarMenuButton
      ref={ref}
      size="lg"
      className="rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
      {...props}
    >
      <Avatar className="size-9 shrink-0 rounded-full border border-sidebar-border">
        <AvatarFallback className="rounded-full bg-sidebar-primary text-xs text-sidebar-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      {!isCollapsed ? (
        <>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{name}</span>
            <span className="truncate text-xs opacity-80">{roleLabel}</span>
          </div>
          <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-70" />
        </>
      ) : null}
    </SidebarMenuButton>
  );
});

export function TopBarUser() {
  const { user, roleLabel } = useAuth();

  if (!user) {
    return null;
  }

  const initials = getInitials(user.name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TopBarUserTrigger
          initials={initials}
          name={user.name}
          roleLabel={roleLabel}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56 rounded-lg">
        <UserMenuDropdownContent />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SidebarUser() {
  const { isMobile } = useSidebar();
  const { user, roleLabel } = useAuth();

  if (!user) {
    return null;
  }

  const initials = getInitials(user.name);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <SidebarUserTrigger
              initials={initials}
              name={user.name}
              roleLabel={roleLabel}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="z-50 min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={8}
          >
            <UserMenuDropdownContent />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import type { UserRole } from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { RbacService } from './rbac.service';

const TENANT_ROLE_VALUES = [
  'org_admin',
  'ceo',
  'team_leader',
  'sales_manager',
  'sales_rep',
  'marketing_head',
  'support_agent',
  'finance',
  'viewer',
] as const;

class CreateUserDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsIn(TENANT_ROLE_VALUES)
  systemRole?: UserRole;

  @IsOptional()
  @IsString()
  customRoleId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionGrants?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionDenies?: string[];
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsIn(TENANT_ROLE_VALUES)
  systemRole?: UserRole;

  @IsOptional()
  @IsString()
  customRoleId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionGrants?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionDenies?: string[];

  @IsOptional()
  @IsUUID()
  teamId?: string | null;
}

class UpdateUserStatusDto {
  @IsIn(['active', 'suspended'])
  status!: 'active' | 'suspended';
}

class BulkUsersDto {
  @IsArray()
  @IsUUID('4', { each: true })
  userIds!: string[];

  @IsIn(['suspend', 'activate', 'delete', 'set_role'])
  action!: 'suspend' | 'activate' | 'delete' | 'set_role';

  @IsOptional()
  @IsString()
  customRoleId?: string;
}

class CreateTeamDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsUUID()
  leaderUserId!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  memberUserIds?: string[];
}

class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsUUID()
  leaderUserId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  memberUserIds?: string[];
}

class CreateRoleDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

class CreatePresetDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

class UpdatePresetDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

@Controller('crm')
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('users')
  @RequirePermissions('users.view')
  listUsers(@CurrentUser() user: AuthUserPayload) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.listUsers(user.organizationId);
  }

  @Post('users')
  @RequirePermissions('users.manage')
  createUser(@CurrentUser() user: AuthUserPayload, @Body() body: CreateUserDto) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.createUser(
      user.organizationId,
      {
        name: body.name,
        email: body.email,
        systemRole: body.systemRole ?? 'sales_rep',
        customRoleId: body.customRoleId,
        permissionGrants: (body.permissionGrants ?? []) as never[],
        permissionDenies: (body.permissionDenies ?? []) as never[],
      },
      user.userId,
    );
  }

  @Post('users/bulk')
  @RequirePermissions('users.manage')
  bulkUsers(@CurrentUser() user: AuthUserPayload, @Body() body: BulkUsersDto) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.bulkUsers(user.organizationId, user.userId, body);
  }

  @Patch('users/:id')
  @RequirePermissions('users.manage')
  updateUser(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.updateUser(user.organizationId, id, {
      name: body.name,
      systemRole: body.systemRole,
      customRoleId: body.customRoleId,
      permissionGrants: body.permissionGrants as never[] | undefined,
      permissionDenies: body.permissionDenies as never[] | undefined,
      teamId: body.teamId,
    });
  }

  @Patch('users/:id/status')
  @RequirePermissions('users.manage')
  updateUserStatus(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto,
  ) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.updateUserStatus(user.organizationId, id, body.status);
  }

  @Delete('users/:id')
  @RequirePermissions('users.manage')
  async deleteUser(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.rbac.assertOrgAccess(user.organizationId);
    const deleted = await this.rbac.deleteUser(user.organizationId, id, user.userId);
    return { deleted };
  }

  @Get('roles')
  @RequirePermissions('roles.view')
  listRoles(@CurrentUser() user: AuthUserPayload) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.listRoles(user.organizationId);
  }

  @Post('roles')
  @RequirePermissions('roles.manage')
  createRole(@CurrentUser() user: AuthUserPayload, @Body() body: CreateRoleDto) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.createRole(user.organizationId, body);
  }

  @Patch('roles/:id')
  @RequirePermissions('roles.manage')
  updateRole(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateRoleDto,
  ) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.updateRole(user.organizationId, id, body);
  }

  @Delete('roles/:id')
  @RequirePermissions('roles.manage')
  async deleteRole(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.rbac.assertOrgAccess(user.organizationId);
    const deleted = await this.rbac.deleteRole(user.organizationId, id);
    return { deleted };
  }

  @Get('permission-presets')
  @RequirePermissions('roles.view')
  listPresets(@CurrentUser() user: AuthUserPayload) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.listPresets(user.organizationId);
  }

  @Post('permission-presets')
  @RequirePermissions('roles.manage')
  createPreset(@CurrentUser() user: AuthUserPayload, @Body() body: CreatePresetDto) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.createPreset(user.organizationId, body);
  }

  @Patch('permission-presets/:id')
  @RequirePermissions('roles.manage')
  updatePreset(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdatePresetDto,
  ) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.updatePreset(user.organizationId, id, body);
  }

  @Delete('permission-presets/:id')
  @RequirePermissions('roles.manage')
  async deletePreset(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.rbac.assertOrgAccess(user.organizationId);
    const deleted = await this.rbac.deletePreset(user.organizationId, id);
    return { deleted };
  }

  @Get('teams')
  @RequirePermissions('users.view')
  listTeams(@CurrentUser() user: AuthUserPayload) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.listTeams(user.organizationId);
  }

  @Post('teams')
  @RequirePermissions('users.manage')
  createTeam(@CurrentUser() user: AuthUserPayload, @Body() body: CreateTeamDto) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.createTeam(user.organizationId, {
      name: body.name,
      leaderUserId: body.leaderUserId,
      memberUserIds: body.memberUserIds ?? [],
    });
  }

  @Patch('teams/:id')
  @RequirePermissions('users.manage')
  updateTeam(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateTeamDto,
  ) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.updateTeam(user.organizationId, id, {
      name: body.name,
      leaderUserId: body.leaderUserId,
      memberUserIds: body.memberUserIds,
    });
  }

  @Delete('teams/:id')
  @RequirePermissions('users.manage')
  async deleteTeam(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.rbac.assertOrgAccess(user.organizationId);
    const deleted = await this.rbac.deleteTeam(user.organizationId, id);
    return { deleted };
  }
}

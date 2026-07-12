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

import { CurrentUser, type AuthUserPayload } from '../common/decorators';
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

@Controller('crm')
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('users')
  listUsers(@CurrentUser() user: AuthUserPayload) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.listUsers(user.organizationId);
  }

  @Post('users')
  createUser(@CurrentUser() user: AuthUserPayload, @Body() body: CreateUserDto) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.createUser(user.organizationId, {
      name: body.name,
      email: body.email,
      systemRole: body.systemRole ?? 'sales_rep',
      customRoleId: body.customRoleId,
      permissionGrants: (body.permissionGrants ?? []) as never[],
      permissionDenies: (body.permissionDenies ?? []) as never[],
    });
  }

  @Patch('users/:id')
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
  updateUserStatus(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto,
  ) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.updateUserStatus(user.organizationId, id, body.status);
  }

  @Get('roles')
  listRoles(@CurrentUser() user: AuthUserPayload) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.listRoles(user.organizationId);
  }

  @Get('teams')
  listTeams(@CurrentUser() user: AuthUserPayload) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.listTeams(user.organizationId);
  }

  @Post('teams')
  createTeam(@CurrentUser() user: AuthUserPayload, @Body() body: CreateTeamDto) {
    this.rbac.assertOrgAccess(user.organizationId);
    return this.rbac.createTeam(user.organizationId, {
      name: body.name,
      leaderUserId: body.leaderUserId,
      memberUserIds: body.memberUserIds ?? [],
    });
  }

  @Patch('teams/:id')
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
  async deleteTeam(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.rbac.assertOrgAccess(user.organizationId);
    const deleted = await this.rbac.deleteTeam(user.organizationId, id);
    return { deleted };
  }
}

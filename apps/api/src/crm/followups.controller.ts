import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import type { FollowupFilter, FollowupQueue, FollowupStatus } from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { actorFromUser } from '../common/actor.util';
import { FollowupsService } from './followups.service';

class BulkFollowupsDto {
  @IsArray()
  @IsString({ each: true })
  followupIds!: string[];

  @IsOptional()
  @IsString()
  scheduleDate?: string;

  @IsOptional()
  @IsString()
  followupStatus?: FollowupStatus;

  @IsOptional()
  @IsString()
  assignedAgentName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  note?: string;
}

@ApiTags('CRM — Follow-ups')
@Controller('crm/followups')
export class FollowupsController {
  constructor(private readonly followups: FollowupsService) {}

  private actor(user: AuthUserPayload) {
    return actorFromUser(user);
  }

  @Get()
  @RequirePermissions('activities.view')
  @ApiOperation({ summary: 'List follow-ups' })
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('queue') queue = '1',
    @Query('filter') filter?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    this.followups.requireOrg(user.organizationId);
    const q = Number(queue) as FollowupQueue;
    return this.followups.list(user.organizationId!, {
      queue: ([1, 2, 3].includes(q) ? q : 1) as FollowupQueue,
      filter: filter as FollowupFilter | undefined,
      search,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  @Post('bulk')
  @RequirePermissions('activities.edit', 'activities.create')
  @ApiOperation({ summary: 'Bulk update follow-ups' })
  bulk(@CurrentUser() user: AuthUserPayload, @Body() body: BulkFollowupsDto) {
    this.followups.requireOrg(user.organizationId);
    return this.followups.bulkAction(user.organizationId!, body, this.actor(user));
  }

  @Post()
  @RequirePermissions('activities.create')
  @ApiOperation({ summary: 'Create follow-up for a customer' })
  create(
    @CurrentUser() user: AuthUserPayload,
    @Body()
    body: {
      customerId: string;
      scheduleDate?: string;
      note?: string;
      assignedAgentName?: string;
      queue?: 1 | 2 | 3;
    },
  ) {
    this.followups.requireOrg(user.organizationId);
    if (!body?.customerId?.trim()) {
      throw new BadRequestException('customerId is required');
    }
    return this.followups.createForCustomer(
      user.organizationId!,
      body,
      this.actor(user),
    );
  }

  @Get(':id')
  @RequirePermissions('activities.view')
  @ApiOperation({ summary: 'Get follow-up by ID' })
  get(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.followups.requireOrg(user.organizationId);
    return this.followups.getById(user.organizationId!, id);
  }

  @Patch(':id')
  @RequirePermissions('activities.edit', 'activities.create')
  @ApiOperation({ summary: 'Update follow-up' })
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body()
    body: {
      scheduleDate?: string;
      followupStatus?: FollowupStatus;
      followupNotes?: string;
      customerNotes?: string;
      tags?: string[];
      skipped?: boolean;
      assignedAgentName?: string;
    },
  ) {
    this.followups.requireOrg(user.organizationId);
    return this.followups.update(user.organizationId!, id, body, this.actor(user));
  }
}

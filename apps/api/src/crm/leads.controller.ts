import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import type { CreateLeadPayload, LeadPipelineQuery, LeadStatus, Permission } from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { actorFromUser } from '../common/actor.util';
import { PermissionResolverService } from '../common/permission-resolver.service';
import { LeadsService } from './leads.service';

class BulkLeadsDto {
  @IsArray()
  @IsString({ each: true })
  leadIds!: string[];

  @IsOptional()
  @IsString()
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  assignedAgentName?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  followUpDue?: string;
}

@ApiTags('CRM — Leads')
@Controller('crm/leads')
export class LeadsController {
  constructor(
    private readonly leads: LeadsService,
    private readonly permissions: PermissionResolverService,
  ) {}

  private actor(user: AuthUserPayload) {
    return actorFromUser(user);
  }

  private async assertAny(userId: string, required: Permission[]) {
    const ok = await this.permissions.userHasPermission(userId, required, 'any');
    if (!ok) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  /** Assign needs leads.assign; other field changes need leads.edit. */
  private async assertLeadMutationAccess(
    userId: string,
    body: {
      assignedAgentName?: string;
      status?: LeadStatus;
      notes?: string;
      note?: string;
      tags?: string[];
      followUpDue?: string;
      address?: string;
      lineItems?: unknown;
    },
  ) {
    const assigning = body.assignedAgentName !== undefined;
    const editingOther =
      body.status !== undefined ||
      body.notes !== undefined ||
      body.note !== undefined ||
      body.tags !== undefined ||
      body.followUpDue !== undefined ||
      body.address !== undefined ||
      body.lineItems !== undefined;

    if (assigning) {
      await this.assertAny(userId, ['leads.assign']);
    }
    if (editingOther || !assigning) {
      await this.assertAny(userId, ['leads.edit']);
    }
  }

  @Get()
  @RequirePermissions('leads.view')
  @ApiOperation({ summary: 'List leads' })
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('agent') agent?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    this.leads.requireOrg(user.organizationId);
    return this.leads.list(user.organizationId!, {
      status: status as Parameters<typeof this.leads.list>[1]['status'],
      source: source as Parameters<typeof this.leads.list>[1]['source'],
      agent,
      search,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  @Get('pipeline')
  @RequirePermissions('leads.view')
  @ApiOperation({ summary: 'Lead pipeline stats' })
  pipeline(
    @CurrentUser() user: AuthUserPayload,
    @Query('source') source?: string,
    @Query('agent') agent?: string,
  ) {
    this.leads.requireOrg(user.organizationId);
    return this.leads.getPipelineStats(user.organizationId!, {
      source: source as LeadPipelineQuery['source'],
      agent,
    });
  }

  @Post('bulk')
  @RequirePermissions('leads.edit', 'leads.assign')
  @ApiOperation({ summary: 'Bulk update leads' })
  async bulk(@CurrentUser() user: AuthUserPayload, @Body() body: BulkLeadsDto) {
    this.leads.requireOrg(user.organizationId);
    await this.assertLeadMutationAccess(user.userId, body);
    return this.leads.bulkAction(user.organizationId!, body, this.actor(user));
  }

  @Get(':id/convert-prefill')
  @RequirePermissions('leads.convert', 'orders.create')
  @ApiOperation({ summary: 'Prefill data to convert lead into an order' })
  convertPrefill(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.leads.requireOrg(user.organizationId);
    return this.leads.getConvertPrefill(user.organizationId!, id);
  }

  @Get(':id')
  @RequirePermissions('leads.view')
  @ApiOperation({ summary: 'Get lead by ID or lead number' })
  get(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.leads.requireOrg(user.organizationId);
    return this.leads.getByIdOrNumber(user.organizationId!, id);
  }

  @Post()
  @RequirePermissions('leads.create')
  @ApiOperation({ summary: 'Create lead' })
  create(@CurrentUser() user: AuthUserPayload, @Body() body: CreateLeadPayload) {
    this.leads.requireOrg(user.organizationId);
    return this.leads.create(user.organizationId!, body, this.actor(user));
  }

  @Patch(':id')
  @RequirePermissions('leads.edit', 'leads.assign')
  @ApiOperation({ summary: 'Update lead' })
  async update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body()
    body: {
      status?: LeadStatus;
      assignedAgentName?: string;
      notes?: string;
      tags?: string[];
      followUpDue?: string;
      address?: string;
      lineItems?: CreateLeadPayload['lineItems'];
    },
  ) {
    this.leads.requireOrg(user.organizationId);
    await this.assertLeadMutationAccess(user.userId, body);
    return this.leads.update(
      user.organizationId!,
      id,
      {
        ...body,
        lineItems: body.lineItems?.map((item, index) => ({
          id: `li-${id}-${index + 1}`,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
        })),
      },
      this.actor(user),
    );
  }

  @Delete(':id')
  @RequirePermissions('leads.edit')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete lead (soft: mark lost)' })
  async remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.leads.requireOrg(user.organizationId);
    await this.leads.update(
      user.organizationId!,
      id,
      { status: 'lost' },
      this.actor(user),
    );
  }
}

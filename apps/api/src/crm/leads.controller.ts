import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import type { CreateLeadPayload, LeadPipelineQuery, LeadStatus } from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { actorFromUser } from '../common/actor.util';
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
  constructor(private readonly leads: LeadsService) {}

  private actor(user: AuthUserPayload) {
    return actorFromUser(user);
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
  @RequirePermissions('leads.edit')
  @ApiOperation({ summary: 'Bulk update leads' })
  bulk(@CurrentUser() user: AuthUserPayload, @Body() body: BulkLeadsDto) {
    this.leads.requireOrg(user.organizationId);
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
  @RequirePermissions('leads.edit')
  @ApiOperation({ summary: 'Update lead' })
  update(
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

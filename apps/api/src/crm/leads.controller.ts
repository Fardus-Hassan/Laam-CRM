import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  NotImplementedException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../common/decorators';
import * as fixtures from './data/crm-fixtures';

@ApiTags('CRM — Leads')
@Controller('crm/leads')
export class LeadsController {
  @Get()
  @RequirePermissions('leads.view')
  @ApiOperation({ summary: 'List leads' })
  list(
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return fixtures.listLeads({
      status: status as Parameters<typeof fixtures.listLeads>[0]['status'],
      source: source as Parameters<typeof fixtures.listLeads>[0]['source'],
      search,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get(':id')
  @RequirePermissions('leads.view')
  @ApiOperation({ summary: 'Get lead by ID' })
  get(@Param('id') id: string) {
    const lead = fixtures.getLead(id);
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  @Post()
  @RequirePermissions('leads.create')
  @ApiOperation({ summary: 'Create lead (not implemented)' })
  create(@Body() _body: Record<string, unknown>) {
    throw new NotImplementedException('Lead create is not implemented yet');
  }

  @Patch(':id')
  @RequirePermissions('leads.edit')
  @ApiOperation({ summary: 'Update lead (not implemented)' })
  update(@Param('id') _id: string, @Body() _body: Record<string, unknown>) {
    throw new NotImplementedException('Lead update is not implemented yet');
  }

  @Delete(':id')
  @RequirePermissions('leads.edit')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete lead (not implemented)' })
  remove(@Param('id') _id: string) {
    throw new NotImplementedException('Lead delete is not implemented yet');
  }
}

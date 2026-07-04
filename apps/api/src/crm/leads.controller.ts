import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import * as fixtures from './data/crm-fixtures';

@ApiTags('CRM — Leads')
@Controller('crm/leads')
export class LeadsController {
  @Get()
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
  @ApiOperation({ summary: 'Get lead by ID' })
  get(@Param('id') id: string) {
    const lead = fixtures.getLead(id);
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }
}

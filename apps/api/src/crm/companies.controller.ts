import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import * as fixtures from './data/crm-fixtures';

@ApiTags('CRM — Companies')
@Controller('crm/companies')
export class CompaniesController {
  @Get()
  @ApiOperation({ summary: 'List customers' })
  list(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return fixtures.listCompanies({
      status: status as Parameters<typeof fixtures.listCompanies>[0]['status'],
      search,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  get(@Param('id') id: string) {
    const company = fixtures.getCompany(id);
    if (!company) throw new NotFoundException('Customer not found');
    return company;
  }
}

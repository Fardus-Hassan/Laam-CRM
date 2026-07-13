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

@ApiTags('CRM — Companies')
@Controller('crm/companies')
export class CompaniesController {
  @Get()
  @RequirePermissions('companies.view')
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
  @RequirePermissions('companies.view')
  @ApiOperation({ summary: 'Get customer by ID' })
  get(@Param('id') id: string) {
    const company = fixtures.getCompany(id);
    if (!company) throw new NotFoundException('Customer not found');
    return company;
  }

  @Post()
  @RequirePermissions('companies.create')
  @ApiOperation({ summary: 'Create customer (not implemented)' })
  create(@Body() _body: Record<string, unknown>) {
    throw new NotImplementedException('Customer create is not implemented yet');
  }

  @Patch(':id')
  @RequirePermissions('companies.edit')
  @ApiOperation({ summary: 'Update customer (not implemented)' })
  update(@Param('id') _id: string, @Body() _body: Record<string, unknown>) {
    throw new NotImplementedException('Customer update is not implemented yet');
  }

  @Delete(':id')
  @RequirePermissions('companies.delete')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete customer (not implemented)' })
  remove(@Param('id') _id: string) {
    throw new NotImplementedException('Customer delete is not implemented yet');
  }
}

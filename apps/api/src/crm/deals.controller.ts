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

@ApiTags('CRM — Deals')
@Controller('crm/deals')
export class DealsController {
  @Get()
  @RequirePermissions('deals.view')
  @ApiOperation({ summary: 'List deals' })
  list(
    @Query('stage') stage?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
  ) {
    return fixtures.listDeals({
      stage: stage as Parameters<typeof fixtures.listDeals>[0]['stage'],
      search,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get(':id')
  @RequirePermissions('deals.view')
  @ApiOperation({ summary: 'Get deal by ID' })
  get(@Param('id') id: string) {
    const deal = fixtures.getDeal(id);
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  @Post()
  @RequirePermissions('deals.create')
  @ApiOperation({ summary: 'Create deal (not implemented)' })
  create(@Body() _body: Record<string, unknown>) {
    throw new NotImplementedException('Deal create is not implemented yet');
  }

  @Patch(':id')
  @RequirePermissions('deals.edit')
  @ApiOperation({ summary: 'Update deal (not implemented)' })
  update(@Param('id') _id: string, @Body() _body: Record<string, unknown>) {
    throw new NotImplementedException('Deal update is not implemented yet');
  }

  @Delete(':id')
  @RequirePermissions('deals.delete')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete deal (not implemented)' })
  remove(@Param('id') _id: string) {
    throw new NotImplementedException('Deal delete is not implemented yet');
  }
}

@ApiTags('CRM — Pipeline')
@Controller('crm/pipeline')
export class PipelineController {
  @Get()
  @RequirePermissions('pipeline.view')
  @ApiOperation({ summary: 'Get pipeline board data' })
  get() {
    return fixtures.getPipeline();
  }
}

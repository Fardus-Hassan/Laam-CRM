import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import * as fixtures from './data/crm-fixtures';

@ApiTags('CRM — Deals')
@Controller('crm/deals')
export class DealsController {
  @Get()
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
  @ApiOperation({ summary: 'Get deal by ID' })
  get(@Param('id') id: string) {
    const deal = fixtures.getDeal(id);
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }
}

@ApiTags('CRM — Pipeline')
@Controller('crm/pipeline')
export class PipelineController {
  @Get()
  @ApiOperation({ summary: 'Get pipeline board data' })
  get() {
    return fixtures.getPipeline();
  }
}

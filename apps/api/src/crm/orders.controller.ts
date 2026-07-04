import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import * as fixtures from './data/crm-fixtures';

@ApiTags('CRM — Orders')
@Controller('crm/orders')
export class OrdersController {
  @Get()
  @ApiOperation({ summary: 'List orders' })
  list(
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return fixtures.listOrders({
      status: status as Parameters<typeof fixtures.listOrders>[0]['status'],
      source: source as Parameters<typeof fixtures.listOrders>[0]['source'],
      search,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  get(@Param('id') id: string) {
    const order = fixtures.getOrder(id);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}

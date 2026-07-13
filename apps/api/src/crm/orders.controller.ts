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

@ApiTags('CRM — Orders')
@Controller('crm/orders')
export class OrdersController {
  @Get()
  @RequirePermissions('orders.view')
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
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Get order by ID' })
  get(@Param('id') id: string) {
    const order = fixtures.getOrder(id);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  @Post()
  @RequirePermissions('orders.create')
  @ApiOperation({ summary: 'Create order (not implemented)' })
  create(@Body() _body: Record<string, unknown>) {
    throw new NotImplementedException('Order create is not implemented yet');
  }

  @Patch(':id')
  @RequirePermissions('orders.confirm', 'orders.cancel', 'orders.assign')
  @ApiOperation({ summary: 'Update order (not implemented)' })
  update(@Param('id') _id: string, @Body() _body: Record<string, unknown>) {
    throw new NotImplementedException('Order update is not implemented yet');
  }

  @Delete(':id')
  @RequirePermissions('orders.cancel')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cancel/delete order (not implemented)' })
  remove(@Param('id') _id: string) {
    throw new NotImplementedException('Order delete is not implemented yet');
  }
}

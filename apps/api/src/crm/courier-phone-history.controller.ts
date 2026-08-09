import { Controller, Get, Post, Query } from '@nestjs/common';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { CourierPhoneHistoryService } from './courier-phone-history.service';

@Controller('crm/courier-history')
export class CourierPhoneHistoryController {
  constructor(private readonly history: CourierPhoneHistoryService) {}

  @Get()
  @RequirePermissions('orders.view', 'orders.create', 'customers.view')
  check(
    @CurrentUser() user: AuthUserPayload,
    @Query('phone') phone?: string,
    @Query('refresh') refresh?: string,
  ) {
    return this.history.check(user.organizationId!, phone ?? '', {
      refresh: refresh === '1' || refresh === 'true',
    });
  }

  @Post('refresh')
  @RequirePermissions('orders.view', 'orders.create', 'customers.view')
  refresh(@CurrentUser() user: AuthUserPayload, @Query('phone') phone?: string) {
    return this.history.check(user.organizationId!, phone ?? '', { refresh: true });
  }
}

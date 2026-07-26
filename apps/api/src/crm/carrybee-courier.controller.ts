import { Controller, Get, Param } from '@nestjs/common';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { CarrybeeCourierService } from './carrybee-courier.service';

@Controller('crm/couriers/carrybee')
export class CarrybeeCourierController {
  constructor(private readonly carrybee: CarrybeeCourierService) {}

  @Get('stores')
  @RequirePermissions('orders.create', 'orders.view', 'courier.manage')
  listStores(@CurrentUser() user: AuthUserPayload) {
    return this.carrybee.listStores(user.organizationId!);
  }

  @Get('cities')
  @RequirePermissions('orders.create', 'orders.view')
  listCities(@CurrentUser() user: AuthUserPayload) {
    return this.carrybee.listCities(user.organizationId!);
  }

  @Get('cities/:cityId/zones')
  @RequirePermissions('orders.create', 'orders.view')
  listZones(@CurrentUser() user: AuthUserPayload, @Param('cityId') cityId: string) {
    return this.carrybee.listZones(user.organizationId!, cityId);
  }

  @Get('cities/:cityId/zones/:zoneId/areas')
  @RequirePermissions('orders.create', 'orders.view')
  listAreas(
    @CurrentUser() user: AuthUserPayload,
    @Param('cityId') cityId: string,
    @Param('zoneId') zoneId: string,
  ) {
    return this.carrybee.listAreas(user.organizationId!, cityId, zoneId);
  }
}

import { Controller, Get, Param } from '@nestjs/common';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { PathaoCourierService } from './pathao-courier.service';

@Controller('crm/couriers/pathao')
export class PathaoCourierController {
  constructor(private readonly pathao: PathaoCourierService) {}

  @Get('stores')
  @RequirePermissions('orders.create', 'orders.view', 'courier.manage')
  listStores(@CurrentUser() user: AuthUserPayload) {
    return this.pathao.listStores(user.organizationId!);
  }

  @Get('cities')
  @RequirePermissions('orders.create', 'orders.view')
  listCities(@CurrentUser() user: AuthUserPayload) {
    return this.pathao.listCities(user.organizationId!);
  }

  @Get('cities/:cityId/zones')
  @RequirePermissions('orders.create', 'orders.view')
  listZones(@CurrentUser() user: AuthUserPayload, @Param('cityId') cityId: string) {
    return this.pathao.listZones(user.organizationId!, cityId);
  }

  @Get('zones/:zoneId/areas')
  @RequirePermissions('orders.create', 'orders.view')
  listAreas(@CurrentUser() user: AuthUserPayload, @Param('zoneId') zoneId: string) {
    return this.pathao.listAreas(user.organizationId!, zoneId);
  }
}

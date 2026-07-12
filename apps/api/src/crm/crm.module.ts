import { Module } from '@nestjs/common';

import { CompaniesController } from './companies.controller';
import { ContactsController } from './contacts.controller';
import { DashboardController } from './dashboard.controller';
import { DealsController, PipelineController } from './deals.controller';
import { LeadsController } from './leads.controller';
import { OrdersController } from './orders.controller';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';

@Module({
  controllers: [
    DashboardController,
    LeadsController,
    ContactsController,
    CompaniesController,
    DealsController,
    PipelineController,
    OrdersController,
    RbacController,
  ],
  providers: [RbacService],
  exports: [RbacService],
})
export class CrmModule {}

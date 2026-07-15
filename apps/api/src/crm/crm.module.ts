import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BrandingController } from './branding.controller';
import { BrandingService } from './branding.service';
import { CompaniesController } from './companies.controller';
import { ContactsController } from './contacts.controller';
import { DashboardController } from './dashboard.controller';
import { DealsController, PipelineController } from './deals.controller';
import { LeadsController } from './leads.controller';
import { NotificationsController } from './notifications.controller';
import { OrdersController } from './orders.controller';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';

@Module({
  imports: [AuthModule],
  controllers: [
    DashboardController,
    LeadsController,
    ContactsController,
    CompaniesController,
    DealsController,
    PipelineController,
    OrdersController,
    RbacController,
    BrandingController,
    NotificationsController,
  ],
  providers: [RbacService, BrandingService],
  exports: [RbacService, BrandingService],
})
export class CrmModule {}

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BrandingController } from './branding.controller';
import { BrandingService } from './branding.service';
import { CompaniesController } from './companies.controller';
import { ContactsController } from './contacts.controller';
import { DashboardController } from './dashboard.controller';
import { DealsController, PipelineController } from './deals.controller';
import { InventoryAdvancedController } from './inventory-advanced.controller';
import { InventoryAdvancedService } from './inventory-advanced.service';
import { InventoryCatalogService } from './inventory-catalog.service';
import { InventoryOperationsController } from './inventory-operations.controller';
import { InventoryOperationsService } from './inventory-operations.service';
import { InventoryReportsController } from './inventory-reports.controller';
import { InventoryReportsService } from './inventory-reports.service';
import { InventoryUomService } from './inventory-uom.service';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { NotificationsController } from './notifications.controller';
import { ObjectStorageService } from './object-storage.service';
import { OrgCategoriesController } from './org-categories.controller';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';
import { FollowupsController } from './followups.controller';
import { FollowupsService } from './followups.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PathaoCourierController } from './pathao-courier.controller';
import { PathaoCourierService } from './pathao-courier.service';
import { PathaoSyncService } from './pathao-sync.service';
import { CarrybeeCourierController } from './carrybee-courier.controller';
import { CarrybeeCourierService } from './carrybee-courier.service';
import { CarrybeeSyncService } from './carrybee-sync.service';
import { CourierIntegrationsController } from './courier-integrations.controller';
import { CourierIntegrationsService } from './courier-integrations.service';
import { SmsSettingsController, OrderSmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { OrderPaymentsService } from './order-payments.service';
import { FailedOrdersService } from './failed-orders.service';
import { ProductBrandsController } from './product-brands.controller';
import { ProductsController } from './products.controller';
import { RecycleBinController } from './recycle-bin.controller';
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
    OrderSmsController,
    PathaoCourierController,
    CarrybeeCourierController,
    CourierIntegrationsController,
    SmsSettingsController,
    CouponsController,
    FollowupsController,
    RbacController,
    BrandingController,
    NotificationsController,
    ProductBrandsController,
    OrgCategoriesController,
    ProductsController,
    InventoryOperationsController,
    InventoryReportsController,
    InventoryAdvancedController,
    RecycleBinController,
  ],
  providers: [
    RbacService,
    BrandingService,
    LeadsService,
    FollowupsService,
    OrdersService,
    PathaoCourierService,
    PathaoSyncService,
    CarrybeeCourierService,
    CarrybeeSyncService,
    CourierIntegrationsService,
    SmsService,
    OrderPaymentsService,
    FailedOrdersService,
    CouponsService,
    InventoryCatalogService,
    InventoryOperationsService,
    InventoryReportsService,
    InventoryAdvancedService,
    InventoryUomService,
    ObjectStorageService,
  ],
  exports: [RbacService, BrandingService, InventoryCatalogService, InventoryUomService, ObjectStorageService],
})
export class CrmModule {}

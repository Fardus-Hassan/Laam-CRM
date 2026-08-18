import { Module } from '@nestjs/common';

import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { AuthModule } from '../auth/auth.module';
import { BrandingController } from './branding.controller';
import { BrandingService } from './branding.service';
import { CompaniesController } from './companies.controller';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
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
import { OrgCustomerStatusesController } from './org-customer-statuses.controller';
import { OrgSettingsController } from './org-settings.controller';
import { OrgSettingsService } from './org-settings.service';
import { OrgOrderStatusesController } from './org-order-statuses.controller';
import { OrgOrderStatusesService } from './org-order-statuses.service';
import { OrgOrderQueuesController } from './org-order-queues.controller';
import { OrgOrderQueuesService } from './org-order-queues.service';
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
import { BdCourierService } from './bdcourier.service';
import { CourierHubController } from './courier-hub.controller';
import { CourierHubService } from './courier-hub.service';
import { CourierIntegrationsController } from './courier-integrations.controller';
import { CourierIntegrationsService } from './courier-integrations.service';
import { CourierPhoneHistoryController } from './courier-phone-history.controller';
import { CourierPhoneHistoryService } from './courier-phone-history.service';
import { NavBadgesController } from './nav-badges.controller';
import { SmsSettingsController, OrderSmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { OrderPaymentsService } from './order-payments.service';
import { FailedOrdersService } from './failed-orders.service';
import { ProductBrandsController } from './product-brands.controller';
import { ProductsController } from './products.controller';
import { RecycleBinController } from './recycle-bin.controller';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import {
  WebsiteIntegrationsController,
  WebsiteOrdersIngestController,
} from './website-orders.controller';
import { WebsiteIntegrationsService } from './website-integrations.service';
import { WebsiteOrdersIngestService } from './website-orders-ingest.service';
import { IncentiveController } from './incentive.controller';
import { IncentiveService } from './incentive.service';
import { SecurityBlocksController } from './security-blocks.controller';
import { SecurityBlocksService } from './security-blocks.service';

@Module({
  imports: [AuthModule],
  controllers: [
    DashboardController,
    LeadsController,
    CustomersController,
    ContactsController,
    CompaniesController,
    DealsController,
    PipelineController,
    OrdersController,
    OrderSmsController,
    PathaoCourierController,
    CarrybeeCourierController,
    CourierIntegrationsController,
    CourierHubController,
    NavBadgesController,
    CourierPhoneHistoryController,
    SmsSettingsController,
    WebsiteIntegrationsController,
    WebsiteOrdersIngestController,
    SecurityBlocksController,
    CouponsController,
    FollowupsController,
    RbacController,
    BrandingController,
    OrgSettingsController,
    NotificationsController,
    ProductBrandsController,
    OrgCategoriesController,
    OrgCustomerStatusesController,
    OrgOrderStatusesController,
    OrgOrderQueuesController,
    ProductsController,
    InventoryOperationsController,
    InventoryReportsController,
    InventoryAdvancedController,
    RecycleBinController,
    AccountingController,
    ReportsController,
    TasksController,
    CampaignsController,
    AutomationsController,
    SupportController,
    BillingController,
    IncentiveController,
  ],
  providers: [
    RbacService,
    BrandingService,
    OrgSettingsService,
    LeadsService,
    CustomersService,
    ContactsService,
    FollowupsService,
    AccountingService,
    ReportsService,
    TasksService,
    CampaignsService,
    AutomationsService,
    SupportService,
    BillingService,
    IncentiveService,
    OrdersService,
    PathaoCourierService,
    PathaoSyncService,
    CarrybeeCourierService,
    CarrybeeSyncService,
    CourierIntegrationsService,
    BdCourierService,
    CourierHubService,
    CourierPhoneHistoryService,
    SmsService,
    WebsiteIntegrationsService,
    WebsiteOrdersIngestService,
    SecurityBlocksService,
    OrderPaymentsService,
    FailedOrdersService,
    CouponsService,
    InventoryCatalogService,
    OrgOrderStatusesService,
    OrgOrderQueuesService,
    InventoryOperationsService,
    InventoryReportsService,
    InventoryAdvancedService,
    InventoryUomService,
    ObjectStorageService,
  ],
  exports: [
    RbacService,
    BrandingService,
    InventoryCatalogService,
    InventoryUomService,
    ObjectStorageService,
    OrgOrderStatusesService,
    OrgOrderQueuesService,
    BillingService,
  ],
})
export class CrmModule {}

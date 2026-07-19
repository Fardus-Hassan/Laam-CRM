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
import { LeadsController } from './leads.controller';
import { NotificationsController } from './notifications.controller';
import { ObjectStorageService } from './object-storage.service';
import { OrgCategoriesController } from './org-categories.controller';
import { OrdersController } from './orders.controller';
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
    InventoryCatalogService,
    InventoryOperationsService,
    InventoryReportsService,
    InventoryAdvancedService,
    ObjectStorageService,
  ],
  exports: [RbacService, BrandingService, InventoryCatalogService, ObjectStorageService],
})
export class CrmModule {}

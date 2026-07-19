import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BrandingController } from './branding.controller';
import { BrandingService } from './branding.service';
import { CompaniesController } from './companies.controller';
import { ContactsController } from './contacts.controller';
import { DashboardController } from './dashboard.controller';
import { DealsController, PipelineController } from './deals.controller';
import { InventoryCatalogService } from './inventory-catalog.service';
import { InventoryOperationsController } from './inventory-operations.controller';
import { InventoryOperationsService } from './inventory-operations.service';
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
    RecycleBinController,
  ],
  providers: [
    RbacService,
    BrandingService,
    InventoryCatalogService,
    InventoryOperationsService,
    ObjectStorageService,
  ],
  exports: [RbacService, BrandingService, InventoryCatalogService, ObjectStorageService],
})
export class CrmModule {}

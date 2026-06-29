import { Module } from '@nestjs/common';

import { CompaniesController } from './companies.controller';
import { ContactsController } from './contacts.controller';
import { DealsController, PipelineController } from './deals.controller';
import { LeadsController } from './leads.controller';
import { OrdersController } from './orders.controller';

@Module({
  controllers: [
    LeadsController,
    ContactsController,
    CompaniesController,
    DealsController,
    PipelineController,
    OrdersController,
  ],
})
export class CrmModule {}

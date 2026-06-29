import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import * as fixtures from './data/crm-fixtures';

@ApiTags('CRM — Contacts')
@Controller('crm/contacts')
export class ContactsController {
  @Get()
  @ApiOperation({ summary: 'List contacts' })
  list(
    @Query('source') source?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return fixtures.listContacts({
      source: source as Parameters<typeof fixtures.listContacts>[0]['source'],
      search,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact by ID' })
  get(@Param('id') id: string) {
    const contact = fixtures.getContact(id);
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }
}

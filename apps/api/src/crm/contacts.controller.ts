import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  NotImplementedException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../common/decorators';
import * as fixtures from './data/crm-fixtures';

@ApiTags('CRM — Contacts')
@Controller('crm/contacts')
export class ContactsController {
  @Get()
  @RequirePermissions('contacts.view')
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
  @RequirePermissions('contacts.view')
  @ApiOperation({ summary: 'Get contact by ID' })
  get(@Param('id') id: string) {
    const contact = fixtures.getContact(id);
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  @Post()
  @RequirePermissions('contacts.create')
  @ApiOperation({ summary: 'Create contact (not implemented)' })
  create(@Body() _body: Record<string, unknown>) {
    throw new NotImplementedException('Contact create is not implemented yet');
  }

  @Patch(':id')
  @RequirePermissions('contacts.edit')
  @ApiOperation({ summary: 'Update contact (not implemented)' })
  update(@Param('id') _id: string, @Body() _body: Record<string, unknown>) {
    throw new NotImplementedException('Contact update is not implemented yet');
  }

  @Delete(':id')
  @RequirePermissions('contacts.delete')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete contact (not implemented)' })
  remove(@Param('id') _id: string) {
    throw new NotImplementedException('Contact delete is not implemented yet');
  }
}

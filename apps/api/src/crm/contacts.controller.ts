import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import type { ContactType, CreateContactPayload, OrderSource } from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { ContactsService } from './contacts.service';

class CreateContactDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  phone!: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== '' && v != null)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(['customer', 'supplier', 'partner', 'other'])
  contactType?: ContactType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  organizationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  roleLabel?: string;

  @IsOptional()
  @IsString()
  source?: OrderSource;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  assignedAgentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

class BulkContactsDto {
  @IsArray()
  @IsString({ each: true })
  contactIds!: string[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  assignedAgentName?: string;

  @IsOptional()
  @IsString()
  followUpDue?: string;
}

@ApiTags('CRM — Contacts')
@Controller('crm/contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  @RequirePermissions('contacts.view')
  @ApiOperation({ summary: 'List contacts (suppliers, partners, other)' })
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('segment') segment?: string,
    @Query('contactType') contactType?: string,
    @Query('source') source?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    this.contacts.requireOrg(user.organizationId);
    return this.contacts.list(user.organizationId!, {
      segment,
      contactType: contactType as ContactType | undefined,
      source: source as OrderSource | undefined,
      search,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  @Post('bulk')
  @RequirePermissions('contacts.edit')
  @ApiOperation({ summary: 'Bulk update contacts' })
  bulk(@CurrentUser() user: AuthUserPayload, @Body() body: BulkContactsDto) {
    this.contacts.requireOrg(user.organizationId);
    return this.contacts.bulkAction(user.organizationId!, body);
  }

  @Get(':id')
  @RequirePermissions('contacts.view')
  @ApiOperation({ summary: 'Get contact' })
  get(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.contacts.requireOrg(user.organizationId);
    return this.contacts.get(user.organizationId!, id);
  }

  @Post()
  @RequirePermissions('contacts.create')
  @ApiOperation({ summary: 'Create contact' })
  create(@CurrentUser() user: AuthUserPayload, @Body() body: CreateContactDto) {
    this.contacts.requireOrg(user.organizationId);
    const payload: CreateContactPayload = {
      name: body.name,
      phone: body.phone,
      email: body.email,
      contactType: body.contactType ?? 'other',
      organizationName: body.organizationName,
      roleLabel: body.roleLabel,
      source: body.source ?? 'call',
      area: body.area,
      district: body.district,
      address: body.address,
      assignedAgentName: body.assignedAgentName,
      notes: body.notes,
    };
    return this.contacts.create(user.organizationId!, payload);
  }

  @Patch(':id')
  @RequirePermissions('contacts.edit')
  @ApiOperation({ summary: 'Update contact' })
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: CreateContactDto,
  ) {
    this.contacts.requireOrg(user.organizationId);
    return this.contacts.update(user.organizationId!, id, body);
  }

  @Delete(':id')
  @RequirePermissions('contacts.delete')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete contact' })
  async remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.contacts.requireOrg(user.organizationId);
    await this.contacts.remove(user.organizationId!, id);
  }
}

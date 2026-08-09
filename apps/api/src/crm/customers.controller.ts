import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import type {
  CreateCustomerPayload,
  CustomerStatus,
  UpdateCustomerPayload,
} from '@laam/types';
import type { Response } from 'express';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { actorFromUser } from '../common/actor.util';
import {
  parseCustomerListQuery,
  type CustomerListQueryRaw,
} from './customer-list-query.util';
import { CustomersService } from './customers.service';

class CreateCustomerDto {
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
  @IsString()
  @MaxLength(40)
  altMobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  status?: CustomerStatus;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  assignedAgentName?: string;
}

class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== '' && v != null)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  altMobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  status?: CustomerStatus;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  assignedAgentName?: string;

  @IsOptional()
  @IsBoolean()
  hasFollowUp?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  followUpDue?: string | null;
}

class BulkCustomersDto {
  @IsArray()
  @IsString({ each: true })
  customerIds!: string[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  status?: CustomerStatus;

  @IsOptional()
  @IsString()
  assignedAgentName?: string;

  @IsOptional()
  @IsString()
  followUpDue?: string;
}

@ApiTags('CRM — Customers')
@Controller('crm/customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermissions('companies.view')
  @ApiOperation({ summary: 'List customers' })
  list(@CurrentUser() user: AuthUserPayload, @Query() query: CustomerListQueryRaw) {
    this.customers.requireOrg(user.organizationId);
    return this.customers.list(
      user.organizationId!,
      parseCustomerListQuery(query),
    );
  }

  @Get('export')
  @RequirePermissions('companies.view')
  @ApiOperation({ summary: 'Export filtered customers as CSV' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(
    @CurrentUser() user: AuthUserPayload,
    @Res() res: Response,
    @Query() query: CustomerListQueryRaw,
  ) {
    this.customers.requireOrg(user.organizationId);
    const csv = await this.customers.exportCsv(user.organizationId!, {
      ...parseCustomerListQuery(query),
      page: 1,
      pageSize: 5000,
    });
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="customers-export-${Date.now()}.csv"`,
    );
    res.send(csv);
  }

  @Post('backfill')
  @RequirePermissions('companies.edit')
  @ApiOperation({ summary: 'Backfill customers from existing orders' })
  backfill(@CurrentUser() user: AuthUserPayload) {
    this.customers.requireOrg(user.organizationId);
    return this.customers.backfillFromOrders(user.organizationId!);
  }

  @Get('duplicates')
  @RequirePermissions('companies.view')
  @ApiOperation({ summary: 'Find duplicate customer groups' })
  duplicates(@CurrentUser() user: AuthUserPayload) {
    this.customers.requireOrg(user.organizationId);
    return this.customers.findDuplicates(user.organizationId!);
  }

  @Post('merge')
  @RequirePermissions('companies.edit')
  @ApiOperation({ summary: 'Merge duplicate customers into a primary profile' })
  merge(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: { primaryId: string; duplicateIds: string[] },
  ) {
    this.customers.requireOrg(user.organizationId);
    if (!body?.primaryId || !Array.isArray(body.duplicateIds)) {
      throw new BadRequestException('primaryId and duplicateIds are required');
    }
    return this.customers.merge(
      user.organizationId!,
      body.primaryId,
      body.duplicateIds,
    );
  }

  @Post('bulk')
  @RequirePermissions('companies.edit')
  @ApiOperation({ summary: 'Bulk update customers' })
  bulk(@CurrentUser() user: AuthUserPayload, @Body() body: BulkCustomersDto) {
    this.customers.requireOrg(user.organizationId);
    return this.customers.bulkAction(user.organizationId!, body, actorFromUser(user));
  }

  @Get(':id')
  @RequirePermissions('companies.view')
  @ApiOperation({ summary: 'Get customer by id or number' })
  get(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.customers.requireOrg(user.organizationId);
    return this.customers.get(user.organizationId!, id);
  }

  @Post()
  @RequirePermissions('companies.create')
  @ApiOperation({ summary: 'Create customer' })
  create(@CurrentUser() user: AuthUserPayload, @Body() body: CreateCustomerDto) {
    this.customers.requireOrg(user.organizationId);
    const payload: CreateCustomerPayload = { ...body };
    return this.customers.create(user.organizationId!, payload, actorFromUser(user));
  }

  @Patch(':id')
  @RequirePermissions('companies.edit')
  @ApiOperation({ summary: 'Update customer' })
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateCustomerDto,
  ) {
    this.customers.requireOrg(user.organizationId);
    const payload: UpdateCustomerPayload = { ...body };
    return this.customers.update(user.organizationId!, id, payload, actorFromUser(user));
  }
}

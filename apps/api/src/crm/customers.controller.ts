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
  CustomerCompareOp,
  CustomerStatus,
  UpdateCustomerPayload,
} from '@laam/types';
import type { Response } from 'express';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
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

function num(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

@ApiTags('CRM — Customers')
@Controller('crm/customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermissions('companies.view')
  @ApiOperation({ summary: 'List customers' })
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('segment') segment?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('district') district?: string,
    @Query('employee') employee?: string,
    @Query('product') product?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('lastOrderFrom') lastOrderFrom?: string,
    @Query('lastOrderTo') lastOrderTo?: string,
    @Query('orderCount') orderCount?: string,
    @Query('orderCountOp') orderCountOp?: string,
    @Query('deliveredCount') deliveredCount?: string,
    @Query('deliveredCountOp') deliveredCountOp?: string,
    @Query('courierScoreMin') courierScoreMin?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    this.customers.requireOrg(user.organizationId);
    return this.customers.list(user.organizationId!, {
      segment,
      status,
      search,
      district,
      employee,
      product,
      createdFrom,
      createdTo,
      lastOrderFrom,
      lastOrderTo,
      orderCount: num(orderCount),
      orderCountOp: orderCountOp as CustomerCompareOp | undefined,
      deliveredCount: num(deliveredCount),
      deliveredCountOp: deliveredCountOp as CustomerCompareOp | undefined,
      courierScoreMin: num(courierScoreMin),
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  @Get('export')
  @RequirePermissions('companies.view')
  @ApiOperation({ summary: 'Export filtered customers as CSV' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(
    @CurrentUser() user: AuthUserPayload,
    @Res() res: Response,
    @Query('segment') segment?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('district') district?: string,
    @Query('employee') employee?: string,
    @Query('product') product?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('lastOrderFrom') lastOrderFrom?: string,
    @Query('lastOrderTo') lastOrderTo?: string,
    @Query('orderCount') orderCount?: string,
    @Query('orderCountOp') orderCountOp?: string,
    @Query('deliveredCount') deliveredCount?: string,
    @Query('deliveredCountOp') deliveredCountOp?: string,
    @Query('courierScoreMin') courierScoreMin?: string,
  ) {
    this.customers.requireOrg(user.organizationId);
    const csv = await this.customers.exportCsv(user.organizationId!, {
      segment,
      status,
      search,
      district,
      employee,
      product,
      createdFrom,
      createdTo,
      lastOrderFrom,
      lastOrderTo,
      orderCount: num(orderCount),
      orderCountOp: orderCountOp as CustomerCompareOp | undefined,
      deliveredCount: num(deliveredCount),
      deliveredCountOp: deliveredCountOp as CustomerCompareOp | undefined,
      courierScoreMin: num(courierScoreMin),
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
    return this.customers.bulkAction(user.organizationId!, body);
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
    return this.customers.create(user.organizationId!, payload);
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
    return this.customers.update(user.organizationId!, id, payload);
  }
}

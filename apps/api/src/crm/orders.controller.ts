import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { memoryStorage } from 'multer';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { actorFromUser } from '../common/actor.util';
import { ObjectStorageService } from './object-storage.service';
import { OrderPaymentsService } from './order-payments.service';
import { FailedOrdersService } from './failed-orders.service';
import { OrdersService, type CreateOrderInput } from './orders.service';

class CreateOrderLineDto {
  @IsString()
  productName!: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  variationLabel?: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  discount?: number;
}

class CreateOrderDto {
  @IsString()
  customerName!: string;

  @IsString()
  customerPhone!: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  altMobile?: string;

  @IsString()
  shippingAddress!: string;

  @IsOptional()
  @IsString()
  shippingArea?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsString()
  source!: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsNumber()
  deliveryCharge?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  paidAmount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineDto)
  lineItems!: CreateOrderLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  customerNote?: string;

  @IsOptional()
  @IsString()
  courierNote?: string;

  @IsOptional()
  @IsString()
  packingNote?: string;

  @IsOptional()
  @IsString()
  assignedAgentName?: string;

  @IsOptional()
  @IsBoolean()
  skipFollowup?: boolean;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  customerTag?: string;

  @IsOptional()
  @IsString()
  orderTag?: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsOptional()
  @IsString()
  orderDate?: string;

  @IsOptional()
  @IsNumber()
  courierChargedToMe?: number;

  @IsOptional()
  @IsString()
  pathaoCity?: string;

  @IsOptional()
  @IsString()
  pathaoZone?: string;

  @IsOptional()
  @IsString()
  pathaoArea?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pathaoCityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pathaoZoneId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pathaoAreaId?: number;

  @IsOptional()
  @IsString()
  carrybeeCity?: string;

  @IsOptional()
  @IsString()
  carrybeeZone?: string;

  @IsOptional()
  @IsString()
  carrybeeArea?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  carrybeeCityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  carrybeeZoneId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  carrybeeAreaId?: number;

  @IsOptional()
  @IsString()
  utmSource?: string;

  @IsOptional()
  @IsString()
  utmId?: string;

  @IsOptional()
  @IsString()
  utmContent?: string;

  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  courierWeightKg?: number;

  @IsOptional()
  @IsString()
  courierDeliveryType?: 'normal' | 'express';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentNames?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];
}

class EnqueueFailedOrderDto extends CreateOrderDto {
  @IsOptional()
  @IsString()
  failedType?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  lastUpdateNote?: string;
}

class UpdateOrderDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  altMobile?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  shippingArea?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsNumber()
  deliveryCharge?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  paidAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  customerNote?: string;

  @IsOptional()
  @IsString()
  courierNote?: string;

  @IsOptional()
  @IsString()
  packingNote?: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsOptional()
  @IsBoolean()
  skipFollowup?: boolean;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  customerTag?: string;

  @IsOptional()
  @IsString()
  orderTag?: string;

  @IsOptional()
  @IsString()
  assignedAgentName?: string;

  @IsOptional()
  @IsString()
  pathaoCity?: string;

  @IsOptional()
  @IsString()
  pathaoZone?: string;

  @IsOptional()
  @IsString()
  pathaoArea?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined || value === '' ? value : Number(value),
  )
  @IsNumber()
  pathaoCityId?: number | null;

  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined || value === '' ? value : Number(value),
  )
  @IsNumber()
  pathaoZoneId?: number | null;

  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined || value === '' ? value : Number(value),
  )
  @IsNumber()
  pathaoAreaId?: number | null;

  @IsOptional()
  @IsString()
  carrybeeCity?: string;

  @IsOptional()
  @IsString()
  carrybeeZone?: string;

  @IsOptional()
  @IsString()
  carrybeeArea?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined || value === '' ? value : Number(value),
  )
  @IsNumber()
  carrybeeCityId?: number | null;

  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined || value === '' ? value : Number(value),
  )
  @IsNumber()
  carrybeeZoneId?: number | null;

  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined || value === '' ? value : Number(value),
  )
  @IsNumber()
  carrybeeAreaId?: number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineDto)
  lineItems?: CreateOrderLineDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentNames?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];

  @IsOptional()
  @IsString()
  utmSource?: string;

  @IsOptional()
  @IsString()
  utmId?: string;

  @IsOptional()
  @IsString()
  utmContent?: string;

  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined || value === '' ? value : Number(value),
  )
  @IsNumber()
  courierWeightKg?: number | null;

  @IsOptional()
  @IsString()
  courierDeliveryType?: 'normal' | 'express' | null;

  @IsOptional()
  @IsString()
  fulfillmentWarehouseId?: string | null;
}

function parseBoolQuery(value?: string): boolean | undefined {
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}

@ApiTags('CRM — Orders')
@Controller('crm/orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly payments: OrderPaymentsService,
    private readonly failedOrders: FailedOrdersService,
    private readonly storage: ObjectStorageService,
  ) {}

  private actor(user: AuthUserPayload) {
    return actorFromUser(user);
  }

  private toCreateInput(body: CreateOrderDto): CreateOrderInput {
    return {
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      altMobile: body.altMobile,
      shippingAddress: body.shippingAddress,
      shippingArea: body.shippingArea ?? body.district ?? '',
      district: body.district,
      source: body.source as CreateOrderInput['source'],
      status: (body.status ?? 'pending') as CreateOrderInput['status'],
      paymentStatus: body.paymentStatus as CreateOrderInput['paymentStatus'],
      paymentMethod: body.paymentMethod,
      deliveryCharge: body.deliveryCharge ?? 0,
      discount: body.discount ?? 0,
      paidAmount: body.paidAmount,
      lineItems: body.lineItems,
      notes: body.notes,
      customerNote: body.customerNote,
      courierNote: body.courierNote,
      packingNote: body.packingNote,
      assignedAgentName: body.assignedAgentName,
      skipFollowup: body.skipFollowup,
      couponCode: body.couponCode,
      leadId: body.leadId,
      customerTag: body.customerTag,
      orderTag: body.orderTag,
      referenceNo: body.referenceNo,
      orderDate: body.orderDate,
      courierChargedToMe: body.courierChargedToMe,
      pathaoCity: body.pathaoCity,
      pathaoZone: body.pathaoZone,
      pathaoArea: body.pathaoArea,
      pathaoCityId: body.pathaoCityId,
      pathaoZoneId: body.pathaoZoneId,
      pathaoAreaId: body.pathaoAreaId,
      carrybeeCity: body.carrybeeCity,
      carrybeeZone: body.carrybeeZone,
      carrybeeArea: body.carrybeeArea,
      carrybeeCityId: body.carrybeeCityId,
      carrybeeZoneId: body.carrybeeZoneId,
      carrybeeAreaId: body.carrybeeAreaId,
      utmSource: body.utmSource,
      utmId: body.utmId,
      utmContent: body.utmContent,
      utmCampaign: body.utmCampaign,
      courierWeightKg: body.courierWeightKg,
      courierDeliveryType: body.courierDeliveryType,
      attachmentNames: body.attachmentNames,
      attachmentUrls: body.attachmentUrls,
    };
  }

  @Get('meta/form-options')
  @RequirePermissions('orders.view', 'orders.create')
  @ApiOperation({ summary: 'Create-order dropdowns and defaults (org-configurable)' })
  formOptions(@CurrentUser() user: AuthUserPayload) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.getFormOptions(user.organizationId!);
  }

  @Get('meta/status-counts')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Order counts by status for sidebar nav badges' })
  statusCounts(@CurrentUser() user: AuthUserPayload) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.getNavStatusCounts(user.organizationId!);
  }

  @Post('bulk/follow-up')
  @RequirePermissions('orders.confirm', 'orders.create', 'orders.assign')
  @ApiOperation({ summary: 'Bulk set follow-up date and move orders to hold_followup' })
  bulkFollowUp(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: { orderIds?: string[]; followUpDate?: string },
  ) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.bulkSetFollowUp(
      user.organizationId!,
      body.orderIds ?? [],
      body.followUpDate ?? '',
      this.actor(user),
    );
  }

  @Post('bulk')
  @RequirePermissions('orders.confirm', 'orders.create', 'orders.assign', 'orders.cancel')
  @ApiOperation({ summary: 'Bulk order actions (status change, assign, …)' })
  bulkAction(
    @CurrentUser() user: AuthUserPayload,
    @Body()
    body: {
      action?: string;
      orderIds?: string[];
      status?: string;
      employeeName?: string;
      courier?: string;
      fulfillmentWarehouseId?: string;
      confirmRemoteCancelled?: boolean;
    },
  ) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.bulkAction(
      user.organizationId!,
      {
        action: body.action ?? 'status_change',
        orderIds: body.orderIds ?? [],
        status: body.status,
        employeeName: body.employeeName,
        courier: body.courier,
        fulfillmentWarehouseId: body.fulfillmentWarehouseId,
        confirmRemoteCancelled: body.confirmRemoteCancelled,
      },
      this.actor(user),
    );
  }

  @Get('meta/form-options/manage')
  @RequirePermissions('orders.create', 'settings.manage')
  @ApiOperation({ summary: 'List form options for settings CRUD' })
  listFormOptions(@CurrentUser() user: AuthUserPayload, @Query('kind') kind?: string) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.listFormOptionRows(user.organizationId!, kind);
  }

  @Post('meta/form-options')
  @RequirePermissions('orders.create', 'settings.manage')
  @ApiOperation({ summary: 'Create form option' })
  createFormOption(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: { kind: string; value: string; label: string; sortOrder?: number },
  ) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.createFormOption(user.organizationId!, body);
  }

  @Post('meta/statuses/ensure')
  @RequirePermissions('orders.create', 'orders.confirm', 'settings.manage')
  @ApiOperation({
    summary: 'Ensure a status exists in org form options (ops + settings can call)',
  })
  ensureStatus(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: { value?: string; label?: string },
  ) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.ensureStatusFormOption(user.organizationId!, {
      value: body.value ?? '',
      label: body.label,
    });
  }

  @Patch('meta/form-options/:id')
  @RequirePermissions('orders.create', 'settings.manage')
  @ApiOperation({ summary: 'Update form option' })
  updateFormOption(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: { label?: string; value?: string; sortOrder?: number; isActive?: boolean },
  ) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.updateFormOption(user.organizationId!, id, body);
  }

  @Delete('meta/form-options/:id')
  @RequirePermissions('orders.create', 'settings.manage')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete form option' })
  async deleteFormOption(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.orders.requireOrg(user.organizationId);
    await this.orders.deleteFormOption(user.organizationId!, id);
  }

  @Get('meta/customer-lookup')
  @RequirePermissions('orders.view', 'orders.create')
  @ApiOperation({ summary: 'Lookup customer profile by phone from past orders' })
  customerLookup(@CurrentUser() user: AuthUserPayload, @Query('phone') phone?: string) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.lookupCustomer(user.organizationId!, phone ?? '');
  }

  @Get('check-duplicate')
  @RequirePermissions('orders.view', 'orders.create')
  @ApiOperation({ summary: 'Check duplicate order by phone (optional 72h window + products)' })
  checkDuplicate(
    @CurrentUser() user: AuthUserPayload,
    @Query('phone') phone?: string,
    @Query('windowHours') windowHoursRaw?: string,
    @Query('productIds') productIdsRaw?: string | string[],
  ) {
    this.orders.requireOrg(user.organizationId);
    const windowHours = windowHoursRaw ? Number(windowHoursRaw) : undefined;
    const productIds = Array.isArray(productIdsRaw)
      ? productIdsRaw
      : typeof productIdsRaw === 'string' && productIdsRaw.trim()
        ? productIdsRaw.split(',').map((id) => id.trim()).filter(Boolean)
        : undefined;
    return this.orders.checkDuplicate(user.organizationId!, phone ?? '', {
      windowHours: Number.isFinite(windowHours) ? windowHours : undefined,
      productIds,
    });
  }

  @Get('by-phone')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'List orders for a customer phone (history)' })
  listByPhone(
    @CurrentUser() user: AuthUserPayload,
    @Query('phone') phone?: string,
    @Query('exclude') exclude?: string,
  ) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.listByPhone(user.organizationId!, phone ?? '', exclude);
  }

  @Get(':idOrNumber/courier')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Courier progress for an order (status-derived until booking live)' })
  courierTracking(
    @CurrentUser() user: AuthUserPayload,
    @Param('idOrNumber') idOrNumber: string,
  ) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.getCourierTracking(user.organizationId!, idOrNumber);
  }

  @Get()
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'List orders' })
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('search') search?: string,
    @Query('courier') courier?: string,
    @Query('courierStatusSlug') courierStatusSlug?: string,
    @Query('employee') employee?: string,
    @Query('district') district?: string,
    @Query('excludeDistrict') excludeDistrict?: string,
    @Query('excludeStatus') excludeStatus?: string,
    @Query('excludeSource') excludeSource?: string,
    @Query('excludeCourier') excludeCourier?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('product') product?: string,
    @Query('productId') productId?: string,
    @Query('amountMin') amountMin?: string,
    @Query('amountMax') amountMax?: string,
    @Query('pathaoCity') pathaoCity?: string,
    @Query('pathaoZone') pathaoZone?: string,
    @Query('noteStatus') noteStatus?: string,
    @Query('dateRange') dateRange?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('courierDateRange') courierDateRange?: string,
    @Query('courierDateFrom') courierDateFrom?: string,
    @Query('courierDateTo') courierDateTo?: string,
    @Query('followUpDue') followUpDue?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.list(user.organizationId!, {
      status: status as never,
      source: source as never,
      search,
      courier: courier as never,
      courierStatusSlug,
      employee,
      district,
      excludeDistrict: parseBoolQuery(excludeDistrict),
      excludeStatus: parseBoolQuery(excludeStatus),
      excludeSource: parseBoolQuery(excludeSource),
      excludeCourier: parseBoolQuery(excludeCourier),
      paymentStatus: paymentStatus as never,
      product,
      productId,
      amountMin: amountMin != null && amountMin !== '' ? Number(amountMin) : undefined,
      amountMax: amountMax != null && amountMax !== '' ? Number(amountMax) : undefined,
      pathaoCity,
      pathaoZone,
      noteStatus: noteStatus as 'all' | 'has_note' | 'no_note' | undefined,
      dateRange: dateRange as never,
      dateFrom,
      dateTo,
      courierDateRange: courierDateRange as never,
      courierDateFrom,
      courierDateTo,
      followUpDue:
        followUpDue === 'true' || followUpDue === '1'
          ? true
          : followUpDue === 'false' || followUpDue === '0'
            ? false
            : undefined,
      sortBy,
      sortDir: sortDir === 'asc' || sortDir === 'desc' ? sortDir : undefined,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  @Get('payments')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'List order payment ledger rows' })
  listPayments(
    @CurrentUser() user: AuthUserPayload,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('dateRange') dateRange?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    this.orders.requireOrg(user.organizationId);
    return this.payments.list(user.organizationId!, {
      search,
      status: status as never,
      method: method as never,
      dateRange: dateRange as never,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  @Post('payments/:paymentId/reconcile')
  @RequirePermissions('orders.confirm', 'orders.create', 'orders.assign')
  @ApiOperation({ summary: 'Reconcile payment — mark order fully paid' })
  reconcilePayment(
    @CurrentUser() user: AuthUserPayload,
    @Param('paymentId') paymentId: string,
  ) {
    this.orders.requireOrg(user.organizationId);
    return this.payments.reconcile(
      user.organizationId!,
      paymentId,
      actorFromUser(user),
    );
  }

  @Post(':id/payments')
  @RequirePermissions('orders.confirm', 'orders.create', 'orders.assign')
  @ApiOperation({ summary: 'Record a collection against an order' })
  recordPayment(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: { amount?: number; method?: string; note?: string },
  ) {
    this.orders.requireOrg(user.organizationId);
    return this.payments.recordCollection(
      user.organizationId!,
      id,
      {
        amount: Number(body.amount),
        method: body.method,
        note: body.note,
      },
      actorFromUser(user),
    );
  }

  @Get('failed')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'List failed order intake queue' })
  listFailed(
    @CurrentUser() user: AuthUserPayload,
    @Query('search') search?: string,
    @Query('failedType') failedType?: string,
    @Query('noteStatus') noteStatus?: string,
    @Query('website') website?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
  ) {
    this.orders.requireOrg(user.organizationId);
    return this.failedOrders.list(user.organizationId!, {
      search,
      failedType: failedType as 'duplicate' | 'blocked' | 'other' | undefined,
      noteStatus: noteStatus as 'all' | 'has_note' | 'no_note' | undefined,
      website,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 10,
    });
  }

  @Post('failed')
  @RequirePermissions('orders.create')
  @ApiOperation({
    summary: 'Enqueue failed intake (website webhook / duplicate divert)',
  })
  enqueueFailed(@CurrentUser() user: AuthUserPayload, @Body() body: EnqueueFailedOrderDto) {
    this.orders.requireOrg(user.organizationId);
    return this.failedOrders.enqueue(
      user.organizationId!,
      {
        ...this.toCreateInput(body),
        failedType: body.failedType as 'duplicate' | 'blocked' | 'other' | undefined,
        website: body.website,
        lastUpdateNote: body.lastUpdateNote,
      },
      this.actor(user),
    );
  }

  @Post('failed/:id/retry')
  @RequirePermissions('orders.create', 'orders.confirm')
  @ApiOperation({ summary: 'Retry a failed order — creates a real pending order' })
  retryFailed(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.orders.requireOrg(user.organizationId);
    return this.failedOrders.retry(user.organizationId!, id, this.actor(user));
  }

  @Delete('failed/:id')
  @RequirePermissions('orders.create', 'orders.confirm')
  @ApiOperation({ summary: 'Dismiss a failed order from the intake queue' })
  dismissFailed(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.orders.requireOrg(user.organizationId);
    return this.failedOrders.dismiss(user.organizationId!, id);
  }

  @Get(':idOrNumber')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Get order by ID or order number' })
  async get(@CurrentUser() user: AuthUserPayload, @Param('idOrNumber') idOrNumber: string) {
    this.orders.requireOrg(user.organizationId);
    if (idOrNumber.startsWith('ORD-')) {
      return this.orders.getByOrderNumber(user.organizationId!, idOrNumber);
    }
    return this.orders.getById(user.organizationId!, idOrNumber);
  }

  @Post()
  @RequirePermissions('orders.create')
  @ApiOperation({ summary: 'Create order' })
  create(@CurrentUser() user: AuthUserPayload, @Body() body: CreateOrderDto) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.create(user.organizationId!, this.toCreateInput(body), this.actor(user));
  }

  @Post('attachments')
  @RequirePermissions('orders.create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload order attachment (before create)' })
  async uploadAttachment(
    @CurrentUser() user: AuthUserPayload,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    this.orders.requireOrg(user.organizationId);
    return this.storage.uploadOrderAttachment(user.organizationId!, {
      buffer: file.buffer,
      mimetype: file.mimetype,
      size: file.size,
      originalname: file.originalname,
    });
  }

  @Post(':id/courier/pathao/book')
  @RequirePermissions('courier.manage', 'orders.confirm')
  @ApiOperation({ summary: 'Book order with Pathao (org Settings credentials)' })
  bookPathao(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.bookWithPathao(user.organizationId!, id, this.actor(user));
  }

  @Post(':id/courier/pathao/sync')
  @RequirePermissions('courier.manage', 'orders.view', 'orders.confirm')
  @ApiOperation({ summary: 'Refresh Pathao courier status (Short Info)' })
  syncPathao(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.syncPathaoStatus(user.organizationId!, id);
  }

  @Post(':id/courier/carrybee/book')
  @RequirePermissions('courier.manage', 'orders.confirm')
  @ApiOperation({ summary: 'Book order with Carrybee (org Settings credentials)' })
  bookCarrybee(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.bookWithCarrybee(user.organizationId!, id, this.actor(user));
  }

  @Post(':id/courier/carrybee/sync')
  @RequirePermissions('courier.manage', 'orders.view', 'orders.confirm')
  @ApiOperation({ summary: 'Refresh Carrybee courier status' })
  syncCarrybee(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.syncCarrybeeStatus(user.organizationId!, id);
  }

  @Post(':id/courier/cancel')
  @RequirePermissions('courier.manage', 'orders.cancel', 'orders.confirm')
  @ApiOperation({
    summary:
      'Cancel Pathao/Carrybee consignment for this order and clear local courier link',
  })
  cancelCourier(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body?: { reason?: string },
  ) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.cancelCourierShipment(
      user.organizationId!,
      id,
      this.actor(user),
      body?.reason?.trim() || 'Cancelled from CRM',
    );
  }

  @Post(':id/courier/unlink')
  @RequirePermissions('courier.manage', 'orders.cancel', 'orders.confirm')
  @ApiOperation({
    summary:
      'Unlink courier: tries remote cancel first; force-clear with confirmRemoteCancelled when already cancelled in panel',
  })
  unlinkCourier(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body?: { confirmRemoteCancelled?: boolean },
  ) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.unlinkCourierShipment(
      user.organizationId!,
      id,
      this.actor(user),
      { confirmRemoteCancelled: Boolean(body?.confirmRemoteCancelled) },
    );
  }

  @Post(':id/return-lines')
  @RequirePermissions('orders.confirm', 'orders.cancel', 'orders.create')
  @ApiOperation({ summary: 'Record partial/full line returns and restock returned qty' })
  returnLines(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: { lines?: Array<{ lineItemId?: string; quantity?: number }> },
  ) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.returnLines(
      user.organizationId!,
      id,
      {
        lines: (body.lines ?? [])
          .filter((l) => l.lineItemId && l.quantity)
          .map((l) => ({
            lineItemId: String(l.lineItemId),
            quantity: Number(l.quantity),
          })),
      },
      this.actor(user),
    );
  }

  @Patch(':id')
  @RequirePermissions('orders.create', 'orders.confirm', 'orders.cancel', 'orders.assign')
  @ApiOperation({ summary: 'Update order fields and/or status' })
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateOrderDto,
  ) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.update(
      user.organizationId!,
      id,
      body as Parameters<OrdersService['update']>[2],
      this.actor(user),
    );
  }

  @Delete(':id')
  @RequirePermissions('orders.cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Soft-delete order (recycle bin + restock if needed)' })
  remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.softDelete(user.organizationId!, id, this.actor(user));
  }
}

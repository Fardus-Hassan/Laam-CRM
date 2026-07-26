import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  MaxFileSizeValidator,
  NotImplementedException,
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
  @IsArray()
  @IsString({ each: true })
  attachmentNames?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];
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
}

@ApiTags('CRM — Orders')
@Controller('crm/orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly storage: ObjectStorageService,
  ) {}

  private actor(user: AuthUserPayload) {
    return actorFromUser(user);
  }

  @Get('meta/form-options')
  @RequirePermissions('orders.view', 'orders.create')
  @ApiOperation({ summary: 'Create-order dropdowns and defaults (org-configurable)' })
  formOptions(@CurrentUser() user: AuthUserPayload) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.getFormOptions(user.organizationId!);
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
  @ApiOperation({ summary: 'Check duplicate order by phone' })
  checkDuplicate(@CurrentUser() user: AuthUserPayload, @Query('phone') phone?: string) {
    this.orders.requireOrg(user.organizationId);
    return this.orders.checkDuplicate(user.organizationId!, phone ?? '');
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
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
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
    const input: CreateOrderInput = {
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
      utmSource: body.utmSource,
      utmId: body.utmId,
      utmContent: body.utmContent,
      utmCampaign: body.utmCampaign,
      attachmentNames: body.attachmentNames,
      attachmentUrls: body.attachmentUrls,
    };
    return this.orders.create(user.organizationId!, input, this.actor(user));
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
  @HttpCode(204)
  @ApiOperation({ summary: 'Cancel/delete order (not implemented)' })
  remove(@Param('id') _id: string) {
    throw new NotImplementedException('Order delete is not implemented yet');
  }
}

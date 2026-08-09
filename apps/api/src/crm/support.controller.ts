import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import type {
  CreateTicketPayload,
  TicketPriority,
  TicketStatus,
} from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { actorFromUser } from '../common/actor.util';
import { SupportService } from './support.service';

class CreateTicketDto {
  @IsString()
  @MinLength(3)
  subject!: string;

  @IsString()
  @MinLength(3)
  body!: string;

  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority!: TicketPriority;

  @IsString()
  @MinLength(1)
  customerName!: string;

  @IsString()
  @MinLength(1)
  customerMobile!: string;

  @IsOptional()
  @IsString()
  orderNumber?: string;
}

class ReplyTicketDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

class UpdateTicketStatusDto {
  @IsIn(['open', 'pending', 'resolved', 'closed'])
  status!: TicketStatus;
}

@ApiTags('CRM — Support')
@Controller('crm/support/tickets')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  @RequirePermissions('support.view')
  @ApiOperation({ summary: 'List support tickets' })
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    this.support.requireOrg(user.organizationId);
    return this.support.list(user.organizationId!, {
      status: status as never,
      search,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  @Get(':id')
  @RequirePermissions('support.view')
  get(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.support.requireOrg(user.organizationId);
    return this.support.getById(user.organizationId!, id);
  }

  @Post()
  @RequirePermissions('support.create')
  create(@CurrentUser() user: AuthUserPayload, @Body() body: CreateTicketDto) {
    this.support.requireOrg(user.organizationId);
    return this.support.create(
      user.organizationId!,
      body as CreateTicketPayload,
      actorFromUser(user),
    );
  }

  @Post(':id/reply')
  @RequirePermissions('support.manage')
  reply(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: ReplyTicketDto,
  ) {
    this.support.requireOrg(user.organizationId);
    return this.support.reply(
      user.organizationId!,
      id,
      body.body,
      actorFromUser(user),
    );
  }

  @Patch(':id/status')
  @RequirePermissions('support.manage')
  updateStatus(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateTicketStatusDto,
  ) {
    this.support.requireOrg(user.organizationId);
    return this.support.updateStatus(
      user.organizationId!,
      id,
      body.status,
      actorFromUser(user),
    );
  }
}

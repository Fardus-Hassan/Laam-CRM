import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  MessageEvent,
  Param,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString } from 'class-validator';
import type { Observable } from 'rxjs';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { NotificationsService } from './notifications.service';

function parseOptionalLimit(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new BadRequestException('limit must be an integer number');
  }
  if (n < 1 || n > 50) {
    throw new BadRequestException('limit must be between 1 and 50');
  }
  return n;
}

class BulkDeleteNotificationsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];
}

@Controller('crm/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @RequirePermissions('notifications.view')
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limitRaw?: string,
    @Query('search') search?: string,
    @Query('date') date?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.notifications.listForUser(user.userId, {
      cursor: cursor?.trim() || undefined,
      limit: parseOptionalLimit(limitRaw),
      search: search?.trim() || undefined,
      date: date?.trim() || undefined,
      dateFrom: dateFrom?.trim() || undefined,
      dateTo: dateTo?.trim() || undefined,
    });
  }

  @Get('unread-count')
  @RequirePermissions('notifications.view')
  unreadCount(@CurrentUser() user: AuthUserPayload) {
    return this.notifications.unreadCount(user.userId);
  }

  @Sse('stream')
  @RequirePermissions('notifications.view')
  stream(@CurrentUser() user: AuthUserPayload): Observable<MessageEvent> {
    return this.notifications.watchUnread(user.userId);
  }

  @Post('read-all')
  @RequirePermissions('notifications.view')
  async markAllRead(@CurrentUser() user: AuthUserPayload) {
    await this.notifications.markAllRead(user.userId);
    return { ok: true };
  }

  @Post('bulk-delete')
  @RequirePermissions('notifications.view')
  bulkDelete(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: BulkDeleteNotificationsDto,
  ) {
    return this.notifications.deleteMany(user.userId, body.ids);
  }

  @Post(':id/read')
  @RequirePermissions('notifications.view')
  async markRead(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    await this.notifications.markRead(user.userId, id);
    return { ok: true };
  }

  @Delete(':id')
  @RequirePermissions('notifications.view')
  async remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    await this.notifications.deleteOne(user.userId, id);
    return { ok: true };
  }
}

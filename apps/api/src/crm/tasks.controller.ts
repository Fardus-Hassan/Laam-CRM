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
  IsArray,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import type {
  CreateTaskPayload,
  TaskPriority,
  TaskRelatedType,
  TaskStatus,
  TaskType,
  UpdateTaskPayload,
} from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { actorFromUser } from '../common/actor.util';
import { TasksService } from './tasks.service';

class CreateTaskDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  taskType?: TaskType;

  @IsOptional()
  @IsString()
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  dueTime?: string;

  @IsOptional()
  @IsString()
  assignedAgentName?: string;

  @IsOptional()
  @IsString()
  relatedType?: TaskRelatedType;

  @IsOptional()
  @IsString()
  relatedId?: string;

  @IsOptional()
  @IsString()
  relatedLabel?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  taskType?: TaskType;

  @IsOptional()
  @IsString()
  status?: TaskStatus;

  @IsOptional()
  @IsString()
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  dueTime?: string;

  @IsOptional()
  @IsString()
  assignedAgentName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

class BulkTasksDto {
  @IsArray()
  @IsString({ each: true })
  taskIds!: string[];

  @IsOptional()
  @IsString()
  status?: TaskStatus;

  @IsOptional()
  @IsString()
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  assignedAgentName?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;
}

@ApiTags('CRM — Tasks')
@Controller('crm/tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  private actor(user: AuthUserPayload) {
    return {
      ...actorFromUser(user),
      email: user.email,
      rawName: user.name,
    };
  }

  @Get()
  @RequirePermissions('tasks.view')
  @ApiOperation({ summary: 'List tasks' })
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('filter') filter?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('taskType') taskType?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    this.tasks.requireOrg(user.organizationId);
    return this.tasks.list(
      user.organizationId!,
      {
        filter: filter as never,
        status: status as never,
        priority: priority as never,
        taskType: taskType as never,
        search,
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 20,
      },
      this.actor(user),
    );
  }

  @Post()
  @RequirePermissions('tasks.create')
  create(@CurrentUser() user: AuthUserPayload, @Body() body: CreateTaskDto) {
    this.tasks.requireOrg(user.organizationId);
    return this.tasks.create(
      user.organizationId!,
      body as CreateTaskPayload,
      this.actor(user),
    );
  }

  @Post('bulk')
  @RequirePermissions('tasks.edit', 'tasks.assign')
  bulk(@CurrentUser() user: AuthUserPayload, @Body() body: BulkTasksDto) {
    this.tasks.requireOrg(user.organizationId);
    return this.tasks.bulkAction(user.organizationId!, body, this.actor(user));
  }

  @Get(':id')
  @RequirePermissions('tasks.view')
  get(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.tasks.requireOrg(user.organizationId);
    return this.tasks.getById(user.organizationId!, id);
  }

  @Patch(':id')
  @RequirePermissions('tasks.edit', 'tasks.assign')
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateTaskDto,
  ) {
    this.tasks.requireOrg(user.organizationId);
    return this.tasks.update(
      user.organizationId!,
      id,
      body as UpdateTaskPayload,
      this.actor(user),
    );
  }
}

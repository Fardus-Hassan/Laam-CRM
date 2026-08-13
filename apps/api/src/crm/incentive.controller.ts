import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  CreateIncentiveAssignmentPayload,
  CreateIncentivePlanPayload,
  CreateIncentiveSpecialBonusPayload,
  CreateIncentiveTeamPayload,
  IncentiveMetricType,
  UpdateIncentiveAssignmentPayload,
  UpdateIncentivePlanPayload,
  UpdateIncentiveTeamPayload,
  UpsertIncentiveAttendancePayload,
  UpsertIncentiveChannelPayload,
  UpsertIncentiveSalaryPayload,
  UpsertIncentiveSurveyPayload,
} from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { IncentiveService } from './incentive.service';

const METRIC_TYPES = [
  'order_count',
  'cross_sell_count',
  'return_ratio',
  'recovery_count',
  'survey_count',
  'channel_activity',
  'manual',
] as const;

const HR_STATUSES = [
  'active',
  'warning',
  'final_warning',
  'terminated',
] as const;
const INCENTIVE_CHANNELS = [
  'call',
  'facebook_comment',
  'messenger',
  'whatsapp',
] as const;

class SlabDto {
  @IsOptional()
  @IsString()
  label?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dailyTarget?: number | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyTarget!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  incentiveBdt!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;
}

class CreateTeamDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreatePlanDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  teamId?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsIn(METRIC_TYPES)
  metricType!: IncentiveMetricType;

  @IsOptional()
  metricConfig?: Record<string, unknown> | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  teamMonthlyTarget?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  prorataAboveTop?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlabDto)
  slabs?: SlabDto[];
}

class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  teamId?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsIn(METRIC_TYPES)
  metricType?: IncentiveMetricType;

  @IsOptional()
  metricConfig?: Record<string, unknown> | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  teamMonthlyTarget?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  prorataAboveTop?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlabDto)
  slabs?: SlabDto[];
}

class CreateAssignmentDto {
  @IsString()
  @MinLength(1)
  planId!: string;

  @IsString()
  @MinLength(1)
  agentName!: string;

  @IsOptional()
  @IsString()
  userId?: string | null;

  @IsOptional()
  @IsString()
  shift?: string | null;

  @IsOptional()
  @IsString()
  startsOn?: string;

  @IsOptional()
  @IsString()
  endsOn?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(HR_STATUSES)
  hrStatus?: (typeof HR_STATUSES)[number];
}

class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  agentName?: string;

  @IsOptional()
  @IsString()
  userId?: string | null;

  @IsOptional()
  @IsString()
  shift?: string | null;

  @IsOptional()
  @IsString()
  startsOn?: string;

  @IsOptional()
  @IsString()
  endsOn?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(HR_STATUSES)
  hrStatus?: (typeof HR_STATUSES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  consecutiveMissMonths?: number;
}

class SalaryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basicBdt!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  houseRentBdt!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  medicalBdt!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  conveyanceBdt!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  grossBdt!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  attendanceBonusBdt!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lunchBdt!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalBdt!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  expectedWorkingDays?: number;
}

class ShiftTemplateDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsString()
  reportingTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class ShiftsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShiftTemplateDto)
  shifts!: ShiftTemplateDto[];
}

class ManualActualDto {
  @IsString()
  @MinLength(1)
  assignmentId!: string;

  @IsString()
  yearMonth!: string;

  @Type(() => Number)
  @IsNumber()
  actualValue!: number;

  @IsOptional()
  @IsString()
  note?: string | null;
}

class AttendanceDto {
  @IsString()
  @MinLength(1)
  agentName!: string;

  @IsOptional()
  @IsString()
  userId?: string | null;

  @IsString()
  yearMonth!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  presentDays!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  workingDays!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lateCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  earlyLeaveCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unapprovedAbsence?: number;

  @IsOptional()
  @IsString()
  note?: string | null;
}

class SurveyDto {
  @IsString()
  @MinLength(1)
  agentName!: string;

  @IsOptional()
  @IsString()
  assignmentId?: string | null;

  @IsString()
  yearMonth!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  surveyCount!: number;

  @IsOptional()
  @IsString()
  note?: string | null;
}

class ChannelDto {
  @IsString()
  @MinLength(1)
  agentName!: string;

  @IsOptional()
  @IsString()
  assignmentId?: string | null;

  @IsString()
  yearMonth!: string;

  @IsIn(INCENTIVE_CHANNELS)
  channel!: (typeof INCENTIVE_CHANNELS)[number];

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  activityCount!: number;

  @IsOptional()
  @IsString()
  note?: string | null;
}

class SpecialBonusDto {
  @IsString()
  yearMonth!: string;

  @IsString()
  @MinLength(1)
  agentName!: string;

  @IsOptional()
  @IsString()
  assignmentId?: string | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountBdt!: number;

  @IsString()
  @MinLength(1)
  reason!: string;
}

@ApiTags('CRM — Incentive')
@Controller('crm/incentive')
export class IncentiveController {
  constructor(private readonly incentive: IncentiveService) {}

  @Get('overview')
  @RequirePermissions('incentive.view')
  @ApiOperation({ summary: 'Incentive hub overview' })
  overview(@CurrentUser() user: AuthUserPayload) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.overview(user.organizationId!);
  }

  @Get('performance')
  @RequirePermissions('incentive.view')
  @ApiOperation({ summary: 'Monthly incentive performance from CRM orders' })
  performance(
    @CurrentUser() user: AuthUserPayload,
    @Query('yearMonth') yearMonth?: string,
  ) {
    this.incentive.requireOrg(user.organizationId);
    const now = new Date();
    const ym =
      yearMonth?.trim() ||
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    return this.incentive.performance(user.organizationId!, ym);
  }

  @Get('my-summary')
  @RequirePermissions('incentive.view', 'dashboard.view')
  @ApiOperation({ summary: 'Signed-in agent incentive summary (dashboard)' })
  mySummary(
    @CurrentUser() user: AuthUserPayload,
    @Query('yearMonth') yearMonth?: string,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.mySummary(
      user.organizationId!,
      { userId: user.userId, name: user.name },
      yearMonth,
    );
  }

  @Get('periods/:yearMonth/export')
  @RequirePermissions('incentive.view', 'incentive.manage')
  @ApiOperation({
    summary: 'Payroll-ready CSV for an approved/paid incentive period',
  })
  exportPayroll(
    @CurrentUser() user: AuthUserPayload,
    @Param('yearMonth') yearMonth: string,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.exportPayrollCsv(user.organizationId!, yearMonth);
  }

  @Get('ops')
  @RequirePermissions('incentive.view')
  @ApiOperation({
    summary: 'Monthly attendance, survey, channel, and bonus operations',
  })
  getOps(
    @CurrentUser() user: AuthUserPayload,
    @Query('yearMonth') yearMonth?: string,
  ) {
    this.incentive.requireOrg(user.organizationId);
    const now = new Date();
    const ym =
      yearMonth?.trim() ||
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    return this.incentive.getOps(user.organizationId!, ym);
  }

  @Put('attendance')
  @RequirePermissions('incentive.manage')
  upsertAttendance(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: AttendanceDto,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.upsertAttendance(
      user.organizationId!,
      body as UpsertIncentiveAttendancePayload,
    );
  }

  @Patch('attendance')
  @RequirePermissions('incentive.manage')
  patchAttendance(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: AttendanceDto,
  ) {
    return this.upsertAttendance(user, body);
  }

  @Put('surveys')
  @RequirePermissions('incentive.manage')
  upsertSurvey(@CurrentUser() user: AuthUserPayload, @Body() body: SurveyDto) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.upsertSurvey(
      user.organizationId!,
      body as UpsertIncentiveSurveyPayload,
    );
  }

  @Patch('surveys')
  @RequirePermissions('incentive.manage')
  patchSurvey(@CurrentUser() user: AuthUserPayload, @Body() body: SurveyDto) {
    return this.upsertSurvey(user, body);
  }

  @Put('channels')
  @RequirePermissions('incentive.manage')
  upsertChannel(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: ChannelDto,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.upsertChannel(
      user.organizationId!,
      body as UpsertIncentiveChannelPayload,
    );
  }

  @Patch('channels')
  @RequirePermissions('incentive.manage')
  patchChannel(@CurrentUser() user: AuthUserPayload, @Body() body: ChannelDto) {
    return this.upsertChannel(user, body);
  }

  @Post('special-bonuses')
  @RequirePermissions('incentive.manage')
  createSpecialBonus(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: SpecialBonusDto,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.createSpecialBonus(
      user.organizationId!,
      body as CreateIncentiveSpecialBonusPayload,
      user,
    );
  }

  @Delete('special-bonuses/:id')
  @RequirePermissions('incentive.manage')
  deleteSpecialBonus(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.deleteSpecialBonus(user.organizationId!, id);
  }

  @Get('periods')
  @RequirePermissions('incentive.view')
  @ApiOperation({ summary: 'List generated incentive periods' })
  listPeriods(@CurrentUser() user: AuthUserPayload) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.listPeriods(user.organizationId!);
  }

  @Get('periods/:yearMonth')
  @RequirePermissions('incentive.view')
  @ApiOperation({ summary: 'Get a generated incentive period' })
  getPeriod(
    @CurrentUser() user: AuthUserPayload,
    @Param('yearMonth') yearMonth: string,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.getPeriod(user.organizationId!, yearMonth);
  }

  @Post('periods/:yearMonth/generate')
  @RequirePermissions('incentive.manage')
  @ApiOperation({ summary: 'Generate or refresh a draft incentive period' })
  generatePeriod(
    @CurrentUser() user: AuthUserPayload,
    @Param('yearMonth') yearMonth: string,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.generatePeriod(user.organizationId!, yearMonth, user);
  }

  @Patch('periods/:yearMonth/approve')
  @RequirePermissions('incentive.manage')
  @ApiOperation({ summary: 'Approve a draft incentive period' })
  approvePeriod(
    @CurrentUser() user: AuthUserPayload,
    @Param('yearMonth') yearMonth: string,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.approvePeriod(user.organizationId!, yearMonth, user);
  }

  @Patch('periods/:yearMonth/paid')
  @RequirePermissions('incentive.manage')
  @ApiOperation({ summary: 'Mark an approved incentive period paid' })
  markPeriodPaid(
    @CurrentUser() user: AuthUserPayload,
    @Param('yearMonth') yearMonth: string,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.markPeriodPaid(user.organizationId!, yearMonth, user);
  }

  @Post('seed-defaults')
  @RequirePermissions('incentive.manage')
  @ApiOperation({ summary: 'Seed Laam-style default teams/plans (once)' })
  seedDefaults(@CurrentUser() user: AuthUserPayload) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.seedDefaults(user.organizationId!);
  }

  @Post('seed-sync-missing')
  @RequirePermissions('incentive.manage')
  @ApiOperation({
    summary: 'Add missing Laam seed teams and plans without wiping data',
  })
  syncMissingSeed(@CurrentUser() user: AuthUserPayload) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.syncMissingSeed(user.organizationId!);
  }

  @Get('teams')
  @RequirePermissions('incentive.view')
  listTeams(@CurrentUser() user: AuthUserPayload) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.listTeams(user.organizationId!);
  }

  @Post('teams')
  @RequirePermissions('incentive.manage')
  createTeam(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: CreateTeamDto,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.createTeam(
      user.organizationId!,
      body as CreateIncentiveTeamPayload,
    );
  }

  @Patch('teams/:id')
  @RequirePermissions('incentive.manage')
  updateTeam(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateTeamDto,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.updateTeam(
      user.organizationId!,
      id,
      body as UpdateIncentiveTeamPayload,
    );
  }

  @Delete('teams/:id')
  @RequirePermissions('incentive.manage')
  deleteTeam(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.deleteTeam(user.organizationId!, id);
  }

  @Get('plans')
  @RequirePermissions('incentive.view')
  listPlans(@CurrentUser() user: AuthUserPayload) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.listPlans(user.organizationId!);
  }

  @Post('plans')
  @RequirePermissions('incentive.manage')
  createPlan(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: CreatePlanDto,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.createPlan(
      user.organizationId!,
      body as CreateIncentivePlanPayload,
    );
  }

  @Patch('plans/:id')
  @RequirePermissions('incentive.manage')
  updatePlan(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdatePlanDto,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.updatePlan(
      user.organizationId!,
      id,
      body as UpdateIncentivePlanPayload,
    );
  }

  @Delete('plans/:id')
  @RequirePermissions('incentive.manage')
  deletePlan(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.deletePlan(user.organizationId!, id);
  }

  @Get('assignments')
  @RequirePermissions('incentive.view')
  listAssignments(@CurrentUser() user: AuthUserPayload) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.listAssignments(user.organizationId!);
  }

  @Post('assignments')
  @RequirePermissions('incentive.manage')
  createAssignment(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: CreateAssignmentDto,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.createAssignment(
      user.organizationId!,
      body as CreateIncentiveAssignmentPayload,
    );
  }

  @Patch('assignments/:id')
  @RequirePermissions('incentive.manage')
  updateAssignment(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateAssignmentDto,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.updateAssignment(
      user.organizationId!,
      id,
      body as UpdateIncentiveAssignmentPayload,
    );
  }

  @Delete('assignments/:id')
  @RequirePermissions('incentive.manage')
  deleteAssignment(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.deleteAssignment(user.organizationId!, id);
  }

  @Patch('salary')
  @RequirePermissions('incentive.manage')
  upsertSalary(@CurrentUser() user: AuthUserPayload, @Body() body: SalaryDto) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.upsertSalary(
      user.organizationId!,
      body as UpsertIncentiveSalaryPayload,
    );
  }

  @Patch('shifts')
  @RequirePermissions('incentive.manage')
  @ApiOperation({ summary: 'Update organization incentive shift templates' })
  upsertShifts(@CurrentUser() user: AuthUserPayload, @Body() body: ShiftsDto) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.upsertShifts(user.organizationId!, body.shifts);
  }

  @Put('manual-actuals')
  @RequirePermissions('incentive.manage')
  @ApiOperation({
    summary: 'Create or replace a monthly manual incentive actual',
  })
  putManualActual(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: ManualActualDto,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.upsertManualActual(user.organizationId!, body, user);
  }

  @Patch('manual-actuals')
  @RequirePermissions('incentive.manage')
  @ApiOperation({
    summary: 'Create or update a monthly manual incentive actual',
  })
  patchManualActual(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: ManualActualDto,
  ) {
    this.incentive.requireOrg(user.organizationId);
    return this.incentive.upsertManualActual(user.organizationId!, body, user);
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { getMockDashboardForRole } from './data/dashboard-mocks';
import { IncentiveService } from './incentive.service';

@ApiTags('CRM — Dashboard')
@Controller('crm/dashboard')
export class DashboardController {
  constructor(private readonly incentive: IncentiveService) {}

  @Get()
  @RequirePermissions('dashboard.view')
  @ApiOperation({
    summary:
      'Role-scoped dashboard payload (fixtures + live incentive overlay for agent/TL)',
  })
  async get(
    @CurrentUser() user: AuthUserPayload,
    @Query('role') role = 'org_admin',
  ) {
    const payload = getMockDashboardForRole(role) as Record<string, unknown>;
    if (!user.organizationId) return payload;

    const roleKey = role.toLowerCase();
    if (
      roleKey !== 'agent' &&
      roleKey !== 'team_leader' &&
      roleKey !== 'teamleader'
    ) {
      return payload;
    }

    try {
      const summary = await this.incentive.mySummary(user.organizationId, {
        userId: user.userId,
        name: user.name,
      });
      if (payload.incentive && typeof payload.incentive === 'object') {
        (payload.incentive as { data: unknown }).data = {
          totalEarned: summary.totalEarned,
          periodLabel: summary.periodLabel,
          breakdown: summary.breakdown,
          nextPayoutDate: summary.nextPayoutDate,
        };
      }
      if (payload.incentiveHistory && typeof payload.incentiveHistory === 'object') {
        (payload.incentiveHistory as { rows: unknown }).rows = summary.history;
      }
    } catch {
      // Keep fixture incentive if calc fails — never blank the dashboard.
    }
    return payload;
  }
}

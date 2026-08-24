import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { getMockDashboardForRole } from './data/dashboard-mocks';
import { IncentiveService } from './incentive.service';

const LIVE_INCENTIVE_ROLES = new Set([
  'agent',
  'sales_rep',
  'team_leader',
  'teamleader',
]);

function emptyIncentiveOverlay() {
  const now = new Date();
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return {
    totalEarned: 0,
    periodLabel: ym,
    breakdown: [] as Array<{ id: string; label: string; amount: number }>,
    nextPayoutDate: '',
    history: [] as Array<{
      id: string;
      date: string;
      description: string;
      type: string;
      amount: number;
    }>,
  };
}

@ApiTags('CRM — Dashboard')
@Controller('crm/dashboard')
export class DashboardController {
  constructor(private readonly incentive: IncentiveService) {}

  @Get()
  @RequirePermissions('dashboard.view')
  @ApiOperation({
    summary:
      'Role-scoped dashboard payload (live incentive overlay for agent/TL)',
  })
  async get(
    @CurrentUser() user: AuthUserPayload,
    @Query('role') role = 'org_admin',
  ) {
    const payload = getMockDashboardForRole(role) as Record<string, unknown>;
    if (!user.organizationId) return payload;

    const roleKey = role.toLowerCase();
    if (!LIVE_INCENTIVE_ROLES.has(roleKey)) {
      return payload;
    }

    let summary = emptyIncentiveOverlay();
    try {
      summary = await this.incentive.mySummary(user.organizationId, {
        userId: user.userId,
        name: user.name,
      });
    } catch {
      // Honest empty — never keep mock finance numbers.
    }

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
    return payload;
  }
}

'use client';

import type { Permission } from '@laam/types';
import { DASHBOARD_WIDGET_PERMISSIONS } from '@laam/types';

import { env } from '@/config/env';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { cn } from '@/lib/utils';

type DashboardWidgetKey = keyof typeof DASHBOARD_WIDGET_PERMISSIONS;

/** Phase A: demo dashboards render fully; widget ACL applies in Phase B. */
const OPEN_DASHBOARD_WIDGETS =
  env.isDev || env.enableRoleSwitch;

export function useDashboardWidget() {
  const { can } = usePermissions();

  return {
    canWidget: (key: DashboardWidgetKey | Permission) => {
      if (OPEN_DASHBOARD_WIDGETS) {
        return true;
      }

      if (key in DASHBOARD_WIDGET_PERMISSIONS) {
        return can(DASHBOARD_WIDGET_PERMISSIONS[key as DashboardWidgetKey]);
      }

      return can(key as Permission);
    },
  };
}

type DashboardWidgetProps = {
  widget: DashboardWidgetKey | Permission;
  /** Grid column span classes — applied to wrapper so layout stays stable. */
  className?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function DashboardWidget({
  widget,
  className,
  children,
  fallback = null,
}: DashboardWidgetProps) {
  const { canWidget } = useDashboardWidget();

  if (!canWidget(widget)) {
    return fallback;
  }

  if (className) {
    return <div className={cn('min-w-0 w-full', className)}>{children}</div>;
  }

  return <div className="min-w-0 w-full">{children}</div>;
}

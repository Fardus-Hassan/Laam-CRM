'use client';

import type { Permission } from '@laam/types';
import { DASHBOARD_WIDGET_PERMISSIONS } from '@laam/types';

import { usePermissions } from '@/features/auth/hooks/use-permissions';

type DashboardWidgetKey = keyof typeof DASHBOARD_WIDGET_PERMISSIONS;

export function useDashboardWidget() {
  const { can } = usePermissions();

  return {
    canWidget: (key: DashboardWidgetKey | Permission) => {
      if (key in DASHBOARD_WIDGET_PERMISSIONS) {
        return can(DASHBOARD_WIDGET_PERMISSIONS[key as DashboardWidgetKey]);
      }

      return can(key as Permission);
    },
  };
}

type DashboardWidgetProps = {
  widget: DashboardWidgetKey | Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function DashboardWidget({
  widget,
  children,
  fallback = null,
}: DashboardWidgetProps) {
  const { canWidget } = useDashboardWidget();

  if (!canWidget(widget)) {
    return fallback;
  }

  return children;
}

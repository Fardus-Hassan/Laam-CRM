'use client';

import * as React from 'react';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { filterNavigation } from '@/features/navigation/lib/filter-navigation';
import {
  loadOrderQueueFavorites,
  ORDER_QUEUE_FAVORITES_CHANGED,
  sortNavChildrenByFavorites,
} from '@/features/orders/lib/order-queue-favorites';
import { ORDER_STATUSES_CHANGED } from '@/features/orders/data/order-status-store';

export function useNavigation() {
  const { permissions } = usePermissions();
  const [navVersion, setNavVersion] = React.useState(0);

  React.useEffect(() => {
    function refresh() {
      setNavVersion((value) => value + 1);
    }

    window.addEventListener(ORDER_QUEUE_FAVORITES_CHANGED, refresh);
    window.addEventListener(ORDER_STATUSES_CHANGED, refresh);
    return () => {
      window.removeEventListener(ORDER_QUEUE_FAVORITES_CHANGED, refresh);
      window.removeEventListener(ORDER_STATUSES_CHANGED, refresh);
    };
  }, []);

  return React.useMemo(() => {
    const groups = filterNavigation(permissions);
    const favorites = loadOrderQueueFavorites();

    return groups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (item.id !== 'orders' || !item.children?.length) {
          return item;
        }
        return {
          ...item,
          children: sortNavChildrenByFavorites(item.children, favorites),
        };
      }),
    }));
  }, [permissions, navVersion]);
}

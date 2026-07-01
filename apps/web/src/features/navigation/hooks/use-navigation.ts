'use client';

import * as React from 'react';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { filterNavigation } from '@/features/navigation/lib/filter-navigation';
import {
  loadOrderQueueFavorites,
  ORDER_QUEUE_FAVORITES_CHANGED,
  sortNavChildrenByFavorites,
} from '@/features/orders/lib/order-queue-favorites';

export function useNavigation() {
  const { permissions } = usePermissions();
  const [favoritesVersion, setFavoritesVersion] = React.useState(0);

  React.useEffect(() => {
    function onFavoritesChanged() {
      setFavoritesVersion((v) => v + 1);
    }
    window.addEventListener(ORDER_QUEUE_FAVORITES_CHANGED, onFavoritesChanged);
    return () => window.removeEventListener(ORDER_QUEUE_FAVORITES_CHANGED, onFavoritesChanged);
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
  }, [permissions, favoritesVersion]);
}

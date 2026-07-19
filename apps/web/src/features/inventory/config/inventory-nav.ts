import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  Blend,
  FolderTree,
  Package,
  RotateCcw,
  ShoppingBag,
  Tag,
  Truck,
} from 'lucide-react';

export type InventorySubNavItem = {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
};

export const INVENTORY_SUB_NAV: InventorySubNavItem[] = [
  { id: 'products', title: 'Products', href: '/dashboard/inventory/products', icon: Package },
  { id: 'brands', title: 'Brands', href: '/dashboard/inventory/brands', icon: Tag },
  {
    id: 'categories',
    title: 'Categories',
    href: '/dashboard/settings/categories',
    icon: FolderTree,
  },
  { id: 'suppliers', title: 'Suppliers', href: '/dashboard/inventory/suppliers', icon: Truck },
  { id: 'purchase', title: 'Purchase', href: '/dashboard/inventory/purchase', icon: ShoppingBag },
  {
    id: 'purchase-returns',
    title: 'Purchase returns',
    href: '/dashboard/inventory/purchase-returns',
    icon: RotateCcw,
  },
  {
    id: 'adjustment',
    title: 'Stock adjustment',
    href: '/dashboard/inventory/adjustment',
    icon: ArrowLeftRight,
  },
  { id: 'mixer', title: 'Mixer / Production', href: '/dashboard/inventory/mixer', icon: Blend },
];

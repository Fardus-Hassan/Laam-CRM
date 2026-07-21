import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  BarChart3,
  Blend,
  FolderTree,
  History,
  Package,
  RotateCcw,
  Scale,
  ShoppingBag,
  Tag,
  Truck,
  Warehouse,
} from 'lucide-react';
import type { Permission } from '@laam/types';

export type InventorySubNavItem = {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  /** Any of these permissions unlocks the chip (omit = inventory.view). */
  permissions?: Permission[];
};

export const INVENTORY_SUB_NAV: InventorySubNavItem[] = [
  {
    id: 'reports',
    title: 'Reports',
    href: '/dashboard/inventory/reports',
    icon: BarChart3,
    permissions: ['inventory.view'],
  },
  {
    id: 'stock-movements',
    title: 'Stock ledger',
    href: '/dashboard/inventory/stock-movements',
    icon: History,
    permissions: ['inventory.view'],
  },
  {
    id: 'warehouses',
    title: 'Warehouses',
    href: '/dashboard/inventory/warehouses',
    icon: Warehouse,
    permissions: ['inventory.view', 'inventory.warehouses'],
  },
  {
    id: 'reconciliation',
    title: 'Reconciliation',
    href: '/dashboard/inventory/reconciliation',
    icon: Scale,
    permissions: ['inventory.view'],
  },
  {
    id: 'products',
    title: 'Products',
    href: '/dashboard/inventory/products',
    icon: Package,
    permissions: ['inventory.view'],
  },
  {
    id: 'brands',
    title: 'Brands',
    href: '/dashboard/inventory/brands',
    icon: Tag,
    permissions: ['inventory.view'],
  },
  {
    id: 'categories',
    title: 'Categories',
    href: '/dashboard/settings/categories',
    icon: FolderTree,
    permissions: ['inventory.view', 'settings.manage', 'inventory.create', 'inventory.edit'],
  },
  {
    id: 'suppliers',
    title: 'Suppliers',
    href: '/dashboard/inventory/suppliers',
    icon: Truck,
    permissions: ['inventory.view', 'inventory.purchase'],
  },
  {
    id: 'purchase',
    title: 'Purchase',
    href: '/dashboard/inventory/purchase',
    icon: ShoppingBag,
    permissions: ['inventory.purchase'],
  },
  {
    id: 'purchase-returns',
    title: 'Purchase returns',
    href: '/dashboard/inventory/purchase-returns',
    icon: RotateCcw,
    permissions: ['inventory.purchase'],
  },
  {
    id: 'adjustment',
    title: 'Stock adjustment',
    href: '/dashboard/inventory/adjustment',
    icon: ArrowLeftRight,
    permissions: ['inventory.adjust'],
  },
  {
    id: 'mixer',
    title: 'Mixer / Production',
    href: '/dashboard/inventory/mixer',
    icon: Blend,
    permissions: ['inventory.view', 'inventory.mixer'],
  },
];

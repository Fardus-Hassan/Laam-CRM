import type { LucideIcon } from 'lucide-react';
import type { Permission } from '@laam/types';

export type NavChildDefinition = {
  id: string;
  title: string;
  url: string;
  permissions: Permission[];
};

export type UniversalNavItem = {
  id: string;
  title: string;
  icon: LucideIcon;
  url?: string;
  permissions: Permission[];
  children?: NavChildDefinition[];
};

export type UniversalNavGroup = {
  id: string;
  label: string;
  items: UniversalNavItem[];
};

export type ResolvedNavChild = NavChildDefinition;

export type ResolvedNavItem = UniversalNavItem & {
  children?: ResolvedNavChild[];
};

export type ResolvedNavGroup = {
  id: string;
  label: string;
  items: ResolvedNavItem[];
};

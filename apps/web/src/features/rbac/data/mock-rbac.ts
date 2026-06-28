/**
 * @deprecated Use rbacApi / mock-tenant-store. Kept for backward-compatible imports.
 */
export {
  PERMISSION_PRESETS,
  createRole as createCustomRole,
  deleteRole as deleteCustomRole,
  getDemoCustomRoleIdForUserRole,
  getPresetById,
  getRolePermissions as getCustomRolePermissions,
  listRoles as listCustomRoles,
  updateRole as updateCustomRole,
} from '@/features/platform/data/mock-tenant-store';

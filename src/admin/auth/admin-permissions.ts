// src/admin/auth/admin-permissions.ts
import { SetMetadata } from '@nestjs/common';
import { AdminRole } from './entity/admin.entity.js';

/**
 * Server-side admin authorization.
 *
 * Admin roles are the fixed `admins.role` enum. (The `roles` / `permissions` tables are a separate,
 * currently unlinked RBAC model: no admin references them, so they are NOT used for authorization.)
 *
 * Every route guarded by AdminJwtAuthGuard must declare exactly one permission with
 * @RequireAdminPermission(...). Routes without a declaration are DENIED (403) — default deny.
 */
export const AdminPermission = {
  SELF: 'admin.self', // own profile (/admin/auth/me)
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage', // non-destructive account changes, XP/coin adjustments, admin password reset of a learner
  USERS_DELETE: 'users.delete', // permanent deletion
  ANALYTICS_VIEW: 'analytics.view',
  CONTENT_MANAGE: 'content.manage', // courses, question bank
  MODERATION_MANAGE: 'moderation.manage', // reports, AI-generated content
  NOTIFICATIONS_SEND: 'notifications.send',
  FINANCE_VIEW: 'finance.view',
  FINANCE_MANAGE: 'finance.manage', // subscription changes, cancellations, refunds
  SECURITY_VIEW: 'security.view', // security events, audit logs
  SYSTEM_VIEW: 'system.view',
  SETTINGS_MANAGE: 'settings.manage',
  ROLES_MANAGE: 'roles.manage',
  DATA_EXPORT: 'data.export', // bulk export of user PII / platform data
} as const;

export type AdminPermissionName = (typeof AdminPermission)[keyof typeof AdminPermission];

const P = AdminPermission;
const ALL = Object.values(AdminPermission) as AdminPermissionName[];

/** Least-privilege grants per role. Super Admin is the only role with deletion, export, settings and roles. */
export const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermissionName[]> = {
  [AdminRole.SUPER_ADMIN]: ALL,
  [AdminRole.ADMIN]: [
    P.SELF,
    P.USERS_VIEW,
    P.USERS_MANAGE,
    P.ANALYTICS_VIEW,
    P.CONTENT_MANAGE,
    P.MODERATION_MANAGE,
    P.NOTIFICATIONS_SEND,
    P.SECURITY_VIEW,
    P.SYSTEM_VIEW,
  ],
  [AdminRole.MODERATOR]: [P.SELF, P.USERS_VIEW, P.MODERATION_MANAGE],
  [AdminRole.CONTENT_ADMIN]: [P.SELF, P.CONTENT_MANAGE],
  [AdminRole.FINANCE_ADMIN]: [P.SELF, P.FINANCE_VIEW, P.FINANCE_MANAGE, P.ANALYTICS_VIEW],
  [AdminRole.SUPPORT_ADMIN]: [P.SELF, P.USERS_VIEW, P.USERS_MANAGE, P.NOTIFICATIONS_SEND],
  [AdminRole.ANALYST]: [P.SELF, P.ANALYTICS_VIEW],
};

export const ADMIN_PERMISSION_KEY = 'gleamlearn:adminPermission';

/** Declares the permission an admin route requires. */
export const RequireAdminPermission = (permission: AdminPermissionName) => SetMetadata(ADMIN_PERMISSION_KEY, permission);

export function permissionsForRole(role: unknown): readonly AdminPermissionName[] {
  return typeof role === 'string' && role in ROLE_PERMISSIONS ? ROLE_PERMISSIONS[role as AdminRole] : [];
}

export function hasAdminPermission(role: unknown, permission: AdminPermissionName): boolean {
  return permissionsForRole(role).includes(permission);
}

// src/admin/auth/admin-only.decorator.ts
import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from './guards/admin-jwt.guard.js';
import { RequireAdminPermission, type AdminPermissionName } from './admin-permissions.js';

/**
 * Restricts a route OUTSIDE /admin to administrators holding `permission`.
 * Requires an admin token (ADMIN_JWT_SECRET, type 'admin', active admin record): a learner token is
 * rejected with 401, an admin whose role lacks the permission gets 403.
 *
 * Do not combine with a class-level learner JwtAuthGuard on the same controller: both guards would run
 * and the learner guard rejects admin tokens.
 */
export function AdminOnly(permission: AdminPermissionName) {
  return applyDecorators(
    UseGuards(AdminJwtAuthGuard),
    RequireAdminPermission(permission),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Admin token required (learner tokens are not accepted).' }),
    ApiForbiddenResponse({ description: `Requires the admin permission "${permission}".` }),
  );
}

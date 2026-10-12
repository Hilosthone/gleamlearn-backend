// // src/admin/auth/guards/admin-jwt.guard.ts
// import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';

// @Injectable()
// export class AdminJwtAuthGuard extends AuthGuard('jwt') {
//   canActivate(context: ExecutionContext) {
//     return super.canActivate(context);
//   }

//   handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
//     if (err || !user) {
//       throw err || new UnauthorizedException('Admin authentication required');
//     }

//     // Ensure the token type is specifically 'admin'
//     if (user.type !== 'admin') {
//       throw new UnauthorizedException('Access denied. Admin token required.');
//     }

//     return user;
//   }
// }

// src/admin/auth/guards/admin-jwt.guard.ts
import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ADMIN_PERMISSION_KEY, hasAdminPermission, type AdminPermissionName } from '../admin-permissions.js';

/**
 * Authenticates the admin (admin-jwt strategy: ADMIN_JWT_SECRET, type 'admin', active admin record)
 * and then AUTHORIZES the route: the admin's role must grant the permission declared with
 * @RequireAdminPermission(...). Routes without a declared permission are denied (default deny).
 */
@Injectable()
export class AdminJwtAuthGuard extends AuthGuard('admin-jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = (await super.canActivate(context)) as boolean;
    if (!authenticated) return false;

    const required = this.reflector.getAllAndOverride<AdminPermissionName | undefined>(ADMIN_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) {
      throw new ForbiddenException('This admin operation has no permission policy and is denied.');
    }

    const admin = context.switchToHttp().getRequest().user;
    if (!hasAdminPermission(admin?.role, required)) {
      throw new ForbiddenException('Your admin role does not allow this operation.');
    }
    return true;
  }

  handleRequest(err: any, admin: any, info: any, _context: ExecutionContext) {
    // ADMIN_JWT_SECRET missing/invalid: passport reports it via `info`; surface it as 503, not as a bad token
    if (info instanceof ServiceUnavailableException) {
      throw info;
    }
    if (err || !admin) {
      throw err || new UnauthorizedException('Admin authentication required');
    }

    // Ensure the token type is specifically 'admin'
    if (admin.type !== 'admin' && admin.role === undefined) {
      throw new UnauthorizedException('Access denied. Admin token required.');
    }

    return admin;
  }
}

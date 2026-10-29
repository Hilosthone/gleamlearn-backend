// src/admin/auth/admin-access.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin, AdminRole } from './entity/admin.entity.js';
import { AdminJwtAuthGuard } from './guards/admin-jwt.guard.js';
import { AdminPermission, RequireAdminPermission, ROLE_PERMISSIONS } from './admin-permissions.js';

/**
 * The access model that is actually enforced: each admin role's permissions (fixed in admin-permissions.ts) and the
 * admin accounts holding them. Read-only. (The separate `roles` / `permissions` tables behind /admin/roles are not
 * used for authorization, so editing them would change nothing.)
 */
@ApiTags('Admin Roles & Permissions')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('api/v1/admin/access')
export class AdminAccessController {
  constructor(@InjectRepository(Admin) private readonly admins: Repository<Admin>) {}

  @RequireAdminPermission(AdminPermission.ROLES_MANAGE)
  @Get()
  @ApiOperation({ summary: 'Effective admin roles, their permissions, and the admin accounts' })
  @ApiResponse({ status: 200, description: 'Access model retrieved successfully.' })
  async getAccess() {
    const accounts = await this.admins.find({
      select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
      order: { createdAt: 'ASC' },
    });
    return {
      status: 'success',
      data: {
        roles: (Object.values(AdminRole) as AdminRole[]).map((role) => ({ role, permissions: [...ROLE_PERMISSIONS[role]] })),
        accounts,
      },
    };
  }
}

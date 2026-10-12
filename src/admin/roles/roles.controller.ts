import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { RolesService } from './roles.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { AssignPermissionsDto } from './dto/assign-permissions.dto.js';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard.js';
import { AdminPermission, RequireAdminPermission } from '../auth/admin-permissions.js';

@ApiTags('Admin Roles & Permissions')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('api/v1/admin')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @RequireAdminPermission(AdminPermission.ROLES_MANAGE)
  @Get('roles')
  @ApiOperation({ summary: 'List all custom administrative roles with permissions' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully.' })
  findAllRoles() {
    return this.rolesService.findAllRoles();
  }

  @RequireAdminPermission(AdminPermission.ROLES_MANAGE)
  @Post('roles')
  @ApiOperation({ summary: 'Create a new administrative role' })
  @ApiResponse({ status: 201, description: 'Role created successfully.' })
  createRole(@Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(dto);
  }

  @RequireAdminPermission(AdminPermission.ROLES_MANAGE)
  @Get('roles/:id')
  @ApiOperation({ summary: 'Get details for a specific role by ID' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully.' })
  findRoleById(@Param('id') id: string) {
    return this.rolesService.findRoleById(id);
  }

  @RequireAdminPermission(AdminPermission.ROLES_MANAGE)
  @Patch('roles/:id')
  @ApiOperation({ summary: 'Update an administrative role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully.' })
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, dto);
  }

  @RequireAdminPermission(AdminPermission.ROLES_MANAGE)
  @Delete('roles/:id')
  @ApiOperation({ summary: 'Delete an administrative role' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully.' })
  deleteRole(@Param('id') id: string) {
    return this.rolesService.deleteRole(id);
  }

  @RequireAdminPermission(AdminPermission.ROLES_MANAGE)
  @Get('permissions')
  @ApiOperation({ summary: 'List all available system permissions' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully.' })
  findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @RequireAdminPermission(AdminPermission.ROLES_MANAGE)
  @Post('roles/:id/permissions')
  @ApiOperation({ summary: 'Assign permissions to a specific role' })
  @ApiResponse({ status: 200, description: 'Permissions assigned successfully.' })
  assignPermissions(@Param('id') id: string, @Body() dto: AssignPermissionsDto) {
    return this.rolesService.assignPermissions(id, dto);
  }

  @RequireAdminPermission(AdminPermission.ROLES_MANAGE)
  @Delete('roles/:id/permissions')
  @ApiOperation({ summary: 'Revoke permissions from a specific role' })
  @ApiResponse({ status: 200, description: 'Permissions revoked successfully.' })
  removePermissions(@Param('id') id: string, @Body() dto: AssignPermissionsDto) {
    return this.rolesService.removePermissions(id, dto);
  }
}
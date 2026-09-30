// src/admin/users/users.controller.ts
import { Controller, Get, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AdminUsersService } from './users.service.js';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto.js';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';

@ApiTags('Admin User Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all platform users with pagination and search' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully.' })
  findAll(@Query() query: AdminUsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully.' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get(':id/profile')
  @ApiOperation({ summary: 'Get detailed profile information for a user' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully.' })
  getProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get activity logs for a specific user' })
  @ApiResponse({ status: 200, description: 'User activity retrieved successfully.' })
  getActivity(@Param('id') id: string) {
    return this.usersService.getActivity(id);
  }

  @Get(':id/progress')
  @ApiOperation({ summary: 'Get learning and course progress for a user' })
  @ApiResponse({ status: 200, description: 'User progress retrieved successfully.' })
  getProgress(@Param('id') id: string) {
    return this.usersService.getProgress(id);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get engagement analytics (study hours, XP, coins) for a user' })
  @ApiResponse({ status: 200, description: 'User analytics retrieved successfully.' })
  getAnalytics(@Param('id') id: string) {
    return this.usersService.getAnalytics(id);
  }

  // --- User Actions ---

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend a user account' })
  @ApiResponse({ status: 200, description: 'User suspended successfully.' })
  suspendUser(@Param('id') id: string) {
    return this.usersService.suspendUser(id);
  }

  @Patch(':id/unsuspend')
  @ApiOperation({ summary: 'Unsuspend a user account' })
  @ApiResponse({ status: 200, description: 'User unsuspended successfully.' })
  unsuspendUser(@Param('id') id: string) {
    return this.usersService.unsuspendUser(id);
  }

  @Patch(':id/freeze')
  @ApiOperation({ summary: 'Freeze a user account' })
  @ApiResponse({ status: 200, description: 'User frozen successfully.' })
  freezeUser(@Param('id') id: string) {
    return this.usersService.freezeUser(id);
  }

  @Patch(':id/unfreeze')
  @ApiOperation({ summary: 'Unfreeze a user account' })
  @ApiResponse({ status: 200, description: 'User unfrozen successfully.' })
  unfreezeUser(@Param('id') id: string) {
    return this.usersService.unfreezeUser(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete a user account' })
  @ApiResponse({ status: 200, description: 'User deleted successfully.' })
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  // --- Account Controls ---

  @Patch(':id/reset-password')
  @ApiOperation({ summary: 'Manually reset user password as an admin' })
  @ApiResponse({ status: 200, description: 'User password reset successfully.' })
  resetPassword(@Param('id') id: string, @Body() dto: AdminResetPasswordDto) {
    return this.usersService.resetPassword(id, dto);
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Manually mark a user account as verified' })
  @ApiResponse({ status: 200, description: 'User verified successfully.' })
  verifyUser(@Param('id') id: string) {
    return this.usersService.verifyUser(id);
  }

  @Patch(':id/unverify')
  @ApiOperation({ summary: 'Revoke user account verification status' })
  @ApiResponse({ status: 200, description: 'User unverified successfully.' })
  unverifyUser(@Param('id') id: string) {
    return this.usersService.unverifyUser(id);
  }
}
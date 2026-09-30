// src/admin/auth/admin-auth.controller.ts
import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service.js';
import { 
  AdminLoginDto, 
  AdminForgotPasswordDto, 
  AdminResetPasswordDto, 
  AdminRefreshTokenDto 
} from './dto/admin-auth.dto.js';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';

@ApiTags('Admin Authentication')
@Controller('api/v1/admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Admin login with dedicated credentials' })
  @ApiResponse({ status: 200, description: 'Admin authenticated successfully.' })
  login(@Body() loginDto: AdminLoginDto) {
    return this.adminAuthService.login(loginDto);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Admin logout' })
  @ApiResponse({ status: 200, description: 'Admin logged out successfully.' })
  logout() {
    return this.adminAuthService.logout();
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh admin JWT access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully.' })
  refreshToken(@Body() dto: AdminRefreshTokenDto) {
    return this.adminAuthService.refreshToken(dto.refreshToken);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request admin password reset instructions' })
  @ApiResponse({ status: 200, description: 'Reset instructions sent.' })
  forgotPassword(@Body() dto: AdminForgotPasswordDto) {
    return this.adminAuthService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset admin password using token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  resetPassword(@Body() dto: AdminResetPasswordDto) {
    return this.adminAuthService.resetPassword(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated admin profile and role' })
  @ApiResponse({ status: 200, description: 'Admin profile retrieved successfully.' })
  getMe(@CurrentUser() admin: any) {
    return this.adminAuthService.getMe(admin.sub || admin.id);
  }
}
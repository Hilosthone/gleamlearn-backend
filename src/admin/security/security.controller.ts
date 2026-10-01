import { Controller, Get, Post, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SecurityService } from './security.service.js';
import { RestrictUserDto } from './dto/restrict-user.dto.js';
import { SecurityQueryDto } from './dto/security-query.dto.js';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard.js';

@ApiTags('Admin Security & Abuse Management')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('api/v1/admin')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('security/events')
  @ApiOperation({ summary: 'Retrieve security events, failed login alerts, and threat logs' })
  @ApiResponse({ status: 200, description: 'Security events retrieved successfully.' })
  getSecurityEvents(@Query() query: SecurityQueryDto) {
    return this.securityService.getSecurityEvents(query);
  }

  @Get('security/suspicious-users')
  @ApiOperation({ summary: 'List flagged or restricted users with abuse history' })
  @ApiResponse({ status: 200, description: 'Suspicious users retrieved successfully.' })
  getSuspiciousUsers() {
    return this.securityService.getSuspiciousUsers();
  }

  @Post('users/:id/restrict')
  @ApiOperation({ summary: 'Restrict/suspend a user account due to policy violation or abuse' })
  @ApiResponse({ status: 200, description: 'User restricted successfully.' })
  restrictUser(@Param('id') id: string, @Body() dto: RestrictUserDto, @Req() req: any) {
    return this.securityService.restrictUser(id, dto, req.user.id);
  }

  @Post('users/:id/unrestrict')
  @ApiOperation({ summary: 'Lift suspension and restore user account access' })
  @ApiResponse({ status: 200, description: 'User unrestricted successfully.' })
  unrestrictUser(@Param('id') id: string, @Req() req: any) {
    return this.securityService.unrestrictUser(id, req.user.id);
  }

  @Post('users/:id/force-logout')
  @ApiOperation({ summary: 'Revoke user refresh tokens and force immediate logout across all devices' })
  @ApiResponse({ status: 200, description: 'User force-logged out successfully.' })
  forceLogoutUser(@Param('id') id: string, @Req() req: any) {
    return this.securityService.forceLogoutUser(id, req.user.id);
  }
}
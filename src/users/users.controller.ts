// src/users/users.controller.ts
import { 
  Controller, 
  Get, 
  Patch, 
  Delete, 
  Post, 
  Body, 
  Param, 
  UseGuards 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { UpdateUserDto, UpdateAcademicProfileDto, UpdatePreferencesDto } from './dto/update-user.dto.js';

@ApiTags('Users & Profile')
@ApiBearerAuth() // Indicates that these routes require a bearer token (JWT)
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==========================================
  // AUTHENTICATED USER PRIVATE ROUTES (/me)
  // ==========================================

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  getProfile() {
    // In a real implementation, you extract the user ID from the request object (attached by your JWT Guard)
    return this.usersService.getProfile('current-user-id-placeholder');
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update basic authenticated user details' })
  updateProfile(@Body() updateDto: UpdateUserDto) {
    return this.usersService.updateProfile('current-user-id-placeholder', updateDto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Deactivate or delete current user account' })
  deleteAccount() {
    return this.usersService.deleteAccount('current-user-id-placeholder');
  }

  @Post('me/profile-picture')
  @ApiOperation({ summary: 'Upload or update profile picture' })
  uploadProfilePicture(@Body() body: { imageUrl: string }) {
    return this.usersService.updateProfilePicture('current-user-id-placeholder', body.imageUrl);
  }

  @Delete('me/profile-picture')
  @ApiOperation({ summary: 'Remove profile picture' })
  removeProfilePicture() {
    return this.usersService.removeProfilePicture('current-user-id-placeholder');
  }

  @Patch('me/academic-profile')
  @ApiOperation({ summary: 'Update academic profile (Secondary or University details)' })
  updateAcademicProfile(@Body() academicDto: UpdateAcademicProfileDto) {
    return this.usersService.updateAcademicProfile('current-user-id-placeholder', academicDto);
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update learning preferences and study times' })
  updatePreferences(@Body() prefsDto: UpdatePreferencesDto) {
    return this.usersService.updatePreferences('current-user-id-placeholder', prefsDto);
  }

  @Patch('me/notification-preferences')
  @ApiOperation({ summary: 'Update push/email notification settings' })
  updateNotifications(@Body() notifDto: Record<string, any>) {
    return this.usersService.updateNotificationPreferences('current-user-id-placeholder', notifDto);
  }

  @Patch('me/privacy-settings')
  @ApiOperation({ summary: 'Update profile visibility and privacy controls' })
  updatePrivacy(@Body() privacyDto: Record<string, any>) {
    return this.usersService.updatePrivacySettings('current-user-id-placeholder', privacyDto);
  }

  // ==========================================
  // PUBLIC PROFILE & DISCOVERY ROUTES
  // ==========================================

  @Get(':username')
  @ApiOperation({ summary: 'Get public profile details by username' })
  getPublicProfile(@Param('username') username: string) {
    return this.usersService.getPublicProfile(username);
  }

  @Get(':username/achievements')
  @ApiOperation({ summary: 'Get unlocked badges and achievements for a user' })
  getUserAchievements(@Param('username') username: string) {
    return this.usersService.getUserAchievements(username);
  }

  @Get(':username/stats')
  @ApiOperation({ summary: 'Get learning stats, streak counts, and activity metrics' })
  getUserStats(@Param('username') username: string) {
    return this.usersService.getUserStats(username);
  }
}
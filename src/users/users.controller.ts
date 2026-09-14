// // src/users/users.controller.ts
// import { 
//   Controller, 
//   Get, 
//   Patch, 
//   Delete, 
//   Post, 
//   Body, 
//   Param, 
//   UseGuards 
// } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { UsersService } from './users.service.js';
// import { UpdateUserDto, UpdateAcademicProfileDto, UpdatePreferencesDto } from './dto/update-user.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// @ApiTags('Users & Profile')
// @ApiBearerAuth()
// @Controller('api/v1/users')
// export class UsersController {
//   constructor(private readonly usersService: UsersService) {}

//   // ==========================================
//   // AUTHENTICATED USER PRIVATE ROUTES (/me)
//   // ==========================================

//   @Get('me')
//   @UseGuards(JwtAuthGuard)
//   @ApiOperation({ summary: 'Get current authenticated user profile' })
//   @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
//   getProfile(@CurrentUser('id') userId: string) {
//     return this.usersService.getProfile(userId);
//   }

//   @Patch('me')
//   @UseGuards(JwtAuthGuard)
//   @ApiOperation({ summary: 'Update basic authenticated user details' })
//   updateProfile(@CurrentUser('id') userId: string, @Body() updateDto: UpdateUserDto) {
//     return this.usersService.updateProfile(userId, updateDto);
//   }

//   @Delete('me')
//   @UseGuards(JwtAuthGuard)
//   @ApiOperation({ summary: 'Deactivate or delete current user account' })
//   deleteAccount(@CurrentUser('id') userId: string) {
//     return this.usersService.deleteAccount(userId);
//   }

//   @Post('me/profile-picture')
//   @UseGuards(JwtAuthGuard)
//   @ApiOperation({ summary: 'Upload or update profile picture' })
//   uploadProfilePicture(@CurrentUser('id') userId: string, @Body() body: { imageUrl: string }) {
//     return this.usersService.updateProfilePicture(userId, body.imageUrl);
//   }

//   @Delete('me/profile-picture')
//   @UseGuards(JwtAuthGuard)
//   @ApiOperation({ summary: 'Remove profile picture' })
//   removeProfilePicture(@CurrentUser('id') userId: string) {
//     return this.usersService.removeProfilePicture(userId);
//   }

//   @Patch('me/academic-profile')
//   @UseGuards(JwtAuthGuard)
//   @ApiOperation({ summary: 'Update academic profile (Secondary or University details)' })
//   updateAcademicProfile(@CurrentUser('id') userId: string, @Body() academicDto: UpdateAcademicProfileDto) {
//     return this.usersService.updateAcademicProfile(userId, academicDto);
//   }

//   @Patch('me/preferences')
//   @UseGuards(JwtAuthGuard)
//   @ApiOperation({ summary: 'Update learning preferences and study times' })
//   updatePreferences(@CurrentUser('id') userId: string, @Body() prefsDto: UpdatePreferencesDto) {
//     return this.usersService.updatePreferences(userId, prefsDto);
//   }

//   @Patch('me/notification-preferences')
//   @UseGuards(JwtAuthGuard)
//   @ApiOperation({ summary: 'Update push/email notification settings' })
//   updateNotifications(@CurrentUser('id') userId: string, @Body() notifDto: Record<string, any>) {
//     return this.usersService.updateNotificationPreferences(userId, notifDto);
//   }

//   @Patch('me/privacy-settings')
//   @UseGuards(JwtAuthGuard)
//   @ApiOperation({ summary: 'Update profile visibility and privacy controls' })
//   updatePrivacy(@CurrentUser('id') userId: string, @Body() privacyDto: Record<string, any>) {
//     return this.usersService.updatePrivacySettings(userId, privacyDto);
//   }

//   // ==========================================
//   // PUBLIC PROFILE & DISCOVERY ROUTES
//   // ==========================================

//   @Get(':username')
//   @ApiOperation({ summary: 'Get public profile details by username' })
//   getPublicProfile(@Param('username') username: string) {
//     return this.usersService.getPublicProfile(username);
//   }

//   @Get(':username/achievements')
//   @ApiOperation({ summary: 'Get unlocked badges and achievements for a user' })
//   getUserAchievements(@Param('username') username: string) {
//     return this.usersService.getUserAchievements(username);
//   }

//   @Get(':username/stats')
//   @ApiOperation({ summary: 'Get learning stats, streak counts, and activity metrics' })
//   getUserStats(@Param('username') username: string) {
//     return this.usersService.getUserStats(username);
//   }
// }

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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Users & Profile')
@ApiBearerAuth()
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==========================================
  // AUTHENTICATED USER PRIVATE ROUTES (/me)
  // ==========================================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update basic authenticated user details' })
  updateProfile(@CurrentUser('id') userId: string, @Body() updateDto: UpdateUserDto) {
    return this.usersService.updateProfile(userId, updateDto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Soft delete current user account (marks as deleted in backend)' })
  deleteAccount(@CurrentUser('id') userId: string) {
    return this.usersService.softDeleteAccount(userId);
  }

  @Post('me/freeze')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Freeze current user account temporarily' })
  freezeAccount(@CurrentUser('id') userId: string) {
    return this.usersService.freezeAccount(userId);
  }

  @Post('me/unfreeze')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unfreeze current user account' })
  unfreezeAccount(@CurrentUser('id') userId: string) {
    return this.usersService.unfreezeAccount(userId);
  }

  @Post('me/profile-picture')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upload or update profile picture' })
  uploadProfilePicture(@CurrentUser('id') userId: string, @Body() body: { imageUrl: string }) {
    return this.usersService.updateProfilePicture(userId, body.imageUrl);
  }

  @Delete('me/profile-picture')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove profile picture' })
  removeProfilePicture(@CurrentUser('id') userId: string) {
    return this.usersService.removeProfilePicture(userId);
  }

  @Patch('me/academic-profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update academic profile (Secondary or University details)' })
  updateAcademicProfile(@CurrentUser('id') userId: string, @Body() academicDto: UpdateAcademicProfileDto) {
    return this.usersService.updateAcademicProfile(userId, academicDto);
  }

  @Patch('me/preferences')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update learning preferences and study times' })
  updatePreferences(@CurrentUser('id') userId: string, @Body() prefsDto: UpdatePreferencesDto) {
    return this.usersService.updatePreferences(userId, prefsDto);
  }

  @Patch('me/notification-preferences')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update push/email notification settings' })
  updateNotifications(@CurrentUser('id') userId: string, @Body() notifDto: Record<string, any>) {
    return this.usersService.updateNotificationPreferences(userId, notifDto);
  }

  @Patch('me/privacy-settings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update profile visibility and privacy controls' })
  updatePrivacy(@CurrentUser('id') userId: string, @Body() privacyDto: Record<string, any>) {
    return this.usersService.updatePrivacySettings(userId, privacyDto);
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
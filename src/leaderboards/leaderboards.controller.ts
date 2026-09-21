// // src/leaderboards/leaderboards.controller.ts
// import { Controller, Get, Query, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
// import { LeaderboardsService } from './leaderboards.service.js';
// import { LeaderboardResponseDto, MyRankResponseDto } from './dto/leaderboard-response.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// @ApiTags('Leaderboards')
// @Controller('api/v1/leaderboards')
// export class LeaderboardsController {
//   constructor(private readonly leaderboardsService: LeaderboardsService) {}

//   @Get('global')
//   @ApiOperation({ summary: 'Get global XP leaderboard standings' })
//   @ApiResponse({ status: 200, description: 'Global leaderboard retrieved successfully.', type: LeaderboardResponseDto })
//   getGlobal() {
//     return this.leaderboardsService.getGlobalLeaderboard();
//   }

//   @Get('country')
//   @ApiOperation({ summary: 'Get country-specific leaderboard' })
//   @ApiQuery({ name: 'name', required: true, example: 'Nigeria' })
//   @ApiResponse({ status: 200, description: 'Country leaderboard retrieved successfully.', type: LeaderboardResponseDto })
//   getCountry(@Query('name') name: string) {
//     return this.leaderboardsService.getCountryLeaderboard(name);
//   }

//   @Get('school')
//   @ApiOperation({ summary: 'Get school-specific leaderboard' })
//   @ApiQuery({ name: 'name', required: true, example: 'Springfield High' })
//   @ApiResponse({ status: 200, description: 'School leaderboard retrieved successfully.', type: LeaderboardResponseDto })
//   getSchool(@Query('name') name: string) {
//     return this.leaderboardsService.getSchoolLeaderboard(name);
//   }

//   @Get('university')
//   @ApiOperation({ summary: 'Get university-specific leaderboard' })
//   @ApiQuery({ name: 'name', required: true, example: 'Obafemi Awolowo University' })
//   @ApiResponse({ status: 200, description: 'University leaderboard retrieved successfully.', type: LeaderboardResponseDto })
//   getUniversity(@Query('name') name: string) {
//     return this.leaderboardsService.getUniversityLeaderboard(name);
//   }

//   @Get('department')
//   @ApiOperation({ summary: 'Get department-specific leaderboard' })
//   @ApiQuery({ name: 'name', required: true, example: 'Computer Science' })
//   @ApiResponse({ status: 200, description: 'Department leaderboard retrieved successfully.', type: LeaderboardResponseDto })
//   getDepartment(@Query('name') name: string) {
//     return this.leaderboardsService.getDepartmentLeaderboard(name);
//   }

//   @Get('course')
//   @ApiOperation({ summary: 'Get course-specific leaderboard' })
//   @ApiQuery({ name: 'courseId', required: true, example: 'course_uuid_123' })
//   @ApiResponse({ status: 200, description: 'Course leaderboard retrieved successfully.', type: LeaderboardResponseDto })
//   getCourse(@Query('courseId') courseId: string) {
//     return this.leaderboardsService.getCourseLeaderboard(courseId);
//   }

//   @Get('friends')
//   @ApiBearerAuth()
//   @UseGuards(JwtAuthGuard)
//   @ApiOperation({ summary: 'Get friends network leaderboard' })
//   @ApiResponse({ status: 200, description: 'Friends leaderboard retrieved successfully.', type: LeaderboardResponseDto })
//   getFriends(@CurrentUser() user: any) {
//     return this.leaderboardsService.getFriendsLeaderboard(user.id);
//   }

//   @Get('weekly')
//   @ApiOperation({ summary: 'Get weekly XP leaderboard' })
//   @ApiResponse({ status: 200, description: 'Weekly leaderboard retrieved successfully.', type: LeaderboardResponseDto })
//   getWeekly() {
//     return this.leaderboardsService.getWeeklyLeaderboard();
//   }

//   @Get('monthly')
//   @ApiOperation({ summary: 'Get monthly XP leaderboard' })
//   @ApiResponse({ status: 200, description: 'Monthly leaderboard retrieved successfully.', type: LeaderboardResponseDto })
//   getMonthly() {
//     return this.leaderboardsService.getMonthlyLeaderboard();
//   }

//   @Get('me')
//   @ApiBearerAuth()
//   @UseGuards(JwtAuthGuard)
//   @ApiOperation({ summary: 'Get authenticated user current rank and standing' })
//   @ApiResponse({ status: 200, description: 'User rank fetched successfully.', type: MyRankResponseDto })
//   getMyRank(@CurrentUser() user: any) {
//     return this.leaderboardsService.getMyRank(user.id);
//   }
// }



// src/leaderboards/leaderboards.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LeaderboardsService } from './leaderboards.service.js';
import { LeaderboardResponseDto, MyRankResponseDto } from './dto/leaderboard-response.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Leaderboards')
@Controller('api/v1/leaderboards')
export class LeaderboardsController {
  constructor(private readonly leaderboardsService: LeaderboardsService) {}

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Get('global')
  @ApiOperation({ summary: 'Get global XP leaderboard standings' })
  @ApiResponse({ status: 200, description: 'Global leaderboard retrieved successfully.', type: LeaderboardResponseDto })
  getGlobal() {
    return this.leaderboardsService.getGlobalLeaderboard();
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Get('country')
  @ApiOperation({ summary: 'Get country-specific leaderboard' })
  @ApiQuery({ name: 'name', required: true, example: 'Nigeria' })
  @ApiResponse({ status: 200, description: 'Country leaderboard retrieved successfully.', type: LeaderboardResponseDto })
  getCountry(@Query('name') name: string) {
    return this.leaderboardsService.getCountryLeaderboard(name);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Get('school')
  @ApiOperation({ summary: 'Get school-specific leaderboard' })
  @ApiQuery({ name: 'name', required: true, example: 'Springfield High' })
  @ApiResponse({ status: 200, description: 'School leaderboard retrieved successfully.', type: LeaderboardResponseDto })
  getSchool(@Query('name') name: string) {
    return this.leaderboardsService.getSchoolLeaderboard(name);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Get('university')
  @ApiOperation({ summary: 'Get university-specific leaderboard' })
  @ApiQuery({ name: 'name', required: true, example: 'Obafemi Awolowo University' })
  @ApiResponse({ status: 200, description: 'University leaderboard retrieved successfully.', type: LeaderboardResponseDto })
  getUniversity(@Query('name') name: string) {
    return this.leaderboardsService.getUniversityLeaderboard(name);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Get('department')
  @ApiOperation({ summary: 'Get department-specific leaderboard' })
  @ApiQuery({ name: 'name', required: true, example: 'Computer Science' })
  @ApiResponse({ status: 200, description: 'Department leaderboard retrieved successfully.', type: LeaderboardResponseDto })
  getDepartment(@Query('name') name: string) {
    return this.leaderboardsService.getDepartmentLeaderboard(name);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Get('course')
  @ApiOperation({ summary: 'Get course-specific leaderboard' })
  @ApiQuery({ name: 'courseId', required: true, example: 'course_uuid_123' })
  @ApiResponse({ status: 200, description: 'Course leaderboard retrieved successfully.', type: LeaderboardResponseDto })
  getCourse(@Query('courseId') courseId: string) {
    return this.leaderboardsService.getCourseLeaderboard(courseId);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get('friends')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get friends network leaderboard' })
  @ApiResponse({ status: 200, description: 'Friends leaderboard retrieved successfully.', type: LeaderboardResponseDto })
  getFriends(@CurrentUser() user: any) {
    return this.leaderboardsService.getFriendsLeaderboard(user.id);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Get('weekly')
  @ApiOperation({ summary: 'Get weekly XP leaderboard' })
  @ApiResponse({ status: 200, description: 'Weekly leaderboard retrieved successfully.', type: LeaderboardResponseDto })
  getWeekly() {
    return this.leaderboardsService.getWeeklyLeaderboard();
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly XP leaderboard' })
  @ApiResponse({ status: 200, description: 'Monthly leaderboard retrieved successfully.', type: LeaderboardResponseDto })
  getMonthly() {
    return this.leaderboardsService.getMonthlyLeaderboard();
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get authenticated user current rank and standing' })
  @ApiResponse({ status: 200, description: 'User rank fetched successfully.', type: MyRankResponseDto })
  getMyRank(@CurrentUser() user: any) {
    return this.leaderboardsService.getMyRank(user.id);
  }
}
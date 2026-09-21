// // src/analytics/analytics.controller.ts
// import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
// import { AnalyticsService } from './analytics.service.js';
// import { AnalyticsQueryDto } from './dto/analytics-query.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

// @UseGuards(JwtAuthGuard)
// @Controller('api/v1/analytics')
// export class AnalyticsController {
//   constructor(private readonly service: AnalyticsService) {}

//   @Get('overview')
//   getOverview(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
//     return this.service.getOverview(req.user.userId, query); 
//   }

//   @Get('courses')
//   getCoursesAnalytics(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
//     return this.service.getCoursesAnalytics(req.user.userId, query); 
//   }

//   @Get('courses/:id')
//   getCourseById(@Request() req: any, @Param('id') id: string, @Query() query: AnalyticsQueryDto) { 
//     return this.service.getCourseAnalyticsById(req.user.userId, id, query); 
//   }

//   @Get('topics')
//   getTopicsAnalytics(@Request() req: any) { 
//     return this.service.getTopicsAnalytics(req.user.userId); 
//   }

//   @Get('weak-topics')
//   getWeakTopics(@Request() req: any) { 
//     return this.service.getWeakTopics(req.user.userId); 
//   }

//   @Get('strong-topics')
//   getStrongTopics(@Request() req: any) { 
//     return this.service.getStrongTopics(req.user.userId); 
//   }

//   @Get('quiz-performance')
//   getQuizPerformance(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
//     return this.service.getPerformanceByType(req.user.userId, 'quiz', query); 
//   }

//   @Get('test-performance')
//   getTestPerformance(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
//     return this.service.getPerformanceByType(req.user.userId, 'test', query); 
//   }

//   @Get('exam-performance')
//   getExamPerformance(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
//     return this.service.getPerformanceByType(req.user.userId, 'exam', query); 
//   }

//   @Get('time-spent')
//   getTimeSpent(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
//     return this.service.getTimeSpent(req.user.userId, query); 
//   }

//   @Get('mastery')
//   getMastery(@Request() req: any) { 
//     return this.service.getMastery(req.user.userId); 
//   }
// }



// // src/analytics/analytics.controller.ts

// import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { AnalyticsService } from './analytics.service.js';
// import { AnalyticsQueryDto } from './dto/analytics-query.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

// /**
//  * AnalyticsController manages all assessment metrics, student performance breakdowns,
//  * mastery levels, and time tracking across quizzes, tests, and examinations.
//  * 
//  * Protected by JwtAuthGuard to ensure only authenticated users can access their metrics.
//  */
// @ApiTags('Assessment Analytics')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('api/v1/analytics')
// export class AnalyticsController {
//   constructor(private readonly service: AnalyticsService) {}

//   @Get('overview')
//   @ApiOperation({
//     summary: 'Get performance overview',
//     description: 'Retrieves a high-level performance overview for the authenticated user with optional date and course filters.'
//   })
//   getOverview(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
//     return this.service.getOverview(req.user.userId, query); 
//   }

//   @Get('courses')
//   @ApiOperation({
//     summary: 'Get aggregated course analytics',
//     description: 'Retrieves aggregated analytics and performance breakdown across all enrolled courses.'
//   })
//   getCoursesAnalytics(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
//     return this.service.getCoursesAnalytics(req.user.userId, query); 
//   }

//   @Get('courses/:id')
//   @ApiOperation({
//     summary: 'Get course analytics by ID',
//     description: 'Retrieves detailed analytics and metrics for a specific course using its unique ID.'
//   })
//   getCourseById(@Request() req: any, @Param('id') id: string, @Query() query: AnalyticsQueryDto) { 
//     return this.service.getCourseAnalyticsById(req.user.userId, id, query); 
//   }

//   @Get('topics')
//   @ApiOperation({
//     summary: 'Get topic analytics',
//     description: 'Retrieves topic-by-topic mastery distribution, progress, and coverage percentages.'
//   })
//   getTopicsAnalytics(@Request() req: any) { 
//     return this.service.getTopicsAnalytics(req.user.userId); 
//   }

//   @Get('weak-topics')
//   @ApiOperation({
//     summary: 'Get weak topics',
//     description: 'Identifies weak topics that require targeted revision and review based on low assessment scores.'
//   })
//   getWeakTopics(@Request() req: any) { 
//     return this.service.getWeakTopics(req.user.userId); 
//   }

//   @Get('strong-topics')
//   @ApiOperation({
//     summary: 'Get strong topics',
//     description: 'Identifies strong topics where the student demonstrates high proficiency and mastery.'
//   })
//   getStrongTopics(@Request() req: any) { 
//     return this.service.getStrongTopics(req.user.userId); 
//   }

//   @Get('quiz-performance')
//   @ApiOperation({
//     summary: 'Get quiz performance',
//     description: 'Retrieves performance history, averages, and metrics specifically for quizzes.'
//   })
//   getQuizPerformance(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
//     return this.service.getPerformanceByType(req.user.userId, 'quiz', query); 
//   }

//   @Get('test-performance')
//   @ApiOperation({
//     summary: 'Get test performance',
//     description: 'Retrieves performance history, averages, and metrics specifically for AI-generated tests.'
//   })
//   getTestPerformance(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
//     return this.service.getPerformanceByType(req.user.userId, 'test', query); 
//   }

//   @Get('exam-performance')
//   @ApiOperation({
//     summary: 'Get exam performance',
//     description: 'Retrieves performance history, averages, and metrics specifically for formal examinations.'
//   })
//   getExamPerformance(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
//     return this.service.getPerformanceByType(req.user.userId, 'exam', query); 
//   }

//   @Get('time-spent')
//   @ApiOperation({
//     summary: 'Get time spent metrics',
//     description: 'Tracks total study and assessment time spent across the platform in seconds and hours.'
//   })
//   getTimeSpent(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
//     return this.service.getTimeSpent(req.user.userId, query); 
//   }

//   @Get('mastery')
//   @ApiOperation({
//     summary: 'Get overall mastery',
//     description: 'Calculates the overall platform mastery percentage and structural performance breakdown.'
//   })
//   getMastery(@Request() req: any) { 
//     return this.service.getMastery(req.user.userId); 
//   }
// }

// src/analytics/analytics.controller.ts

import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsQueryDto } from './dto/analytics-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

/**
 * AnalyticsController manages all assessment metrics, student performance breakdowns,
 * mastery levels, and time tracking across quizzes, tests, and examinations.
 * 
 * Protected by JwtAuthGuard to ensure only authenticated users can access their metrics.
 */
@ApiTags('Assessment Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get('overview')
  @ApiOperation({
    summary: 'Get performance overview',
    description: 'Retrieves a high-level performance overview for the authenticated user with optional date and course filters.'
  })
  getOverview(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
    return this.service.getOverview(req.user.userId, query); 
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get('courses')
  @ApiOperation({
    summary: 'Get aggregated course analytics',
    description: 'Retrieves aggregated analytics and performance breakdown across all enrolled courses.'
  })
  getCoursesAnalytics(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
    return this.service.getCoursesAnalytics(req.user.userId, query); 
  }

  @Get('courses/:id')
  @ApiOperation({
    summary: 'Get course analytics by ID',
    description: 'Retrieves detailed analytics and metrics for a specific course using its unique ID.'
  })
  getCourseById(@Request() req: any, @Param('id') id: string, @Query() query: AnalyticsQueryDto) { 
    return this.service.getCourseAnalyticsById(req.user.userId, id, query); 
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get('topics')
  @ApiOperation({
    summary: 'Get topic analytics',
    description: 'Retrieves topic-by-topic mastery distribution, progress, and coverage percentages.'
  })
  getTopicsAnalytics(@Request() req: any) { 
    return this.service.getTopicsAnalytics(req.user.userId); 
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get('weak-topics')
  @ApiOperation({
    summary: 'Get weak topics',
    description: 'Identifies weak topics that require targeted revision and review based on low assessment scores.'
  })
  getWeakTopics(@Request() req: any) { 
    return this.service.getWeakTopics(req.user.userId); 
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get('strong-topics')
  @ApiOperation({
    summary: 'Get strong topics',
    description: 'Identifies strong topics where the student demonstrates high proficiency and mastery.'
  })
  getStrongTopics(@Request() req: any) { 
    return this.service.getStrongTopics(req.user.userId); 
  }

  @Get('quiz-performance')
  @ApiOperation({
    summary: 'Get quiz performance',
    description: 'Retrieves performance history, averages, and metrics specifically for quizzes.'
  })
  getQuizPerformance(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
    return this.service.getPerformanceByType(req.user.userId, 'quiz', query); 
  }

  @Get('test-performance')
  @ApiOperation({
    summary: 'Get test performance',
    description: 'Retrieves performance history, averages, and metrics specifically for AI-generated tests.'
  })
  getTestPerformance(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
    return this.service.getPerformanceByType(req.user.userId, 'test', query); 
  }

  @Get('exam-performance')
  @ApiOperation({
    summary: 'Get exam performance',
    description: 'Retrieves performance history, averages, and metrics specifically for formal examinations.'
  })
  getExamPerformance(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
    return this.service.getPerformanceByType(req.user.userId, 'exam', query); 
  }

  @Get('time-spent')
  @ApiOperation({
    summary: 'Get time spent metrics',
    description: 'Tracks total study and assessment time spent across the platform in seconds and hours.'
  })
  getTimeSpent(@Request() req: any, @Query() query: AnalyticsQueryDto) { 
    return this.service.getTimeSpent(req.user.userId, query); 
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 15, ttl: 60000 } })
  @Get('mastery')
  @ApiOperation({
    summary: 'Get overall mastery',
    description: 'Calculates the overall platform mastery percentage and structural performance breakdown.'
  })
  getMastery(@Request() req: any) { 
    return this.service.getMastery(req.user.userId); 
  }
}
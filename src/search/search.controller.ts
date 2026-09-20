// // // src/search/search.controller.ts
// // import { Controller, Get, Query } from '@nestjs/common';
// // import { SearchService } from './search.service.js';
// // import { SearchQueryDto } from './dto/search-query.dto.js';

// // @Controller('api/v1/search')
// // export class SearchController {
// //   constructor(private readonly searchService: SearchService) {}

// //   @Get()
// //   async globalSearch(@Query() queryDto: SearchQueryDto) {
// //     return this.searchService.searchAll(queryDto.q);
// //   }

// //   @Get('courses')
// //   async searchCourses(@Query() queryDto: SearchQueryDto) {
// //     return this.searchService.searchCourses(queryDto.q);
// //   }

// //   @Get('topics')
// //   async searchTopics(@Query() queryDto: SearchQueryDto) {
// //     return this.searchService.searchTopics(queryDto.q);
// //   }

// //   @Get('questions')
// //   async searchQuestions(@Query() queryDto: SearchQueryDto) {
// //     return this.searchService.searchQuestions(queryDto.q);
// //   }

// //   @Get('materials')
// //   async searchMaterials(@Query() queryDto: SearchQueryDto) {
// //     return this.searchService.searchMaterials(queryDto.q);
// //   }

// //   @Get('users')
// //   async searchUsers(@Query() queryDto: SearchQueryDto) {
// //     return this.searchService.searchUsers(queryDto.q);
// //   }
// // }


// // src/search/search.controller.ts
// import { Controller, Get, Query, UseGuards } from '@nestjs/common';
// import { SearchService } from './search.service.js';
// import { SearchQueryDto } from './dto/search-query.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// @UseGuards(JwtAuthGuard) // Protects all search routes by requiring authentication
// @Controller('api/v1/search')
// export class SearchController {
//   constructor(private readonly searchService: SearchService) {}

//   @Get()
//   async globalSearch(
//     @Query() queryDto: SearchQueryDto,
//     @CurrentUser() user: any, // Access the currently authenticated user if needed
//   ) {
//     return this.searchService.searchAll(queryDto.q, user?.id);
//   }

//   @Get('courses')
//   async searchCourses(@Query() queryDto: SearchQueryDto) {
//     return this.searchService.searchCourses(queryDto.q);
//   }

//   @Get('topics')
//   async searchTopics(@Query() queryDto: SearchQueryDto) {
//     return this.searchService.searchTopics(queryDto.q);
//   }

//   @Get('questions')
//   async searchQuestions(@Query() queryDto: SearchQueryDto) {
//     return this.searchService.searchQuestions(queryDto.q);
//   }

//   @Get('materials')
//   async searchMaterials(@Query() queryDto: SearchQueryDto) {
//     return this.searchService.searchMaterials(queryDto.q);
//   }

//   @Get('users')
//   async searchUsers(@Query() queryDto: SearchQueryDto) {
//     return this.searchService.searchUsers(queryDto.q);
//   }
// }




// src/search/search.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service.js';
import { SearchQueryDto } from './dto/search-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Perform a global search across all categories (courses, topics, questions, materials, users)' })
  @ApiResponse({ status: 200, description: 'Global search results returned successfully.' })
  async globalSearch(
    @Query() queryDto: SearchQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.searchService.searchAll(queryDto.q, user?.id);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Search specifically within courses' })
  @ApiResponse({ status: 200, description: 'List of matching courses.' })
  async searchCourses(@Query() queryDto: SearchQueryDto) {
    return this.searchService.searchCourses(queryDto.q);
  }

  @Get('topics')
  @ApiOperation({ summary: 'Search specifically within topics' })
  @ApiResponse({ status: 200, description: 'List of matching topics.' })
  async searchTopics(@Query() queryDto: SearchQueryDto) {
    return this.searchService.searchTopics(queryDto.q);
  }

  @Get('questions')
  @ApiOperation({ summary: 'Search specifically within questions' })
  @ApiResponse({ status: 200, description: 'List of matching questions.' })
  async searchQuestions(@Query() queryDto: SearchQueryDto) {
    return this.searchService.searchQuestions(queryDto.q);
  }

  @Get('materials')
  @ApiOperation({ summary: 'Search specifically within study materials' })
  @ApiResponse({ status: 200, description: 'List of matching study materials.' })
  async searchMaterials(@Query() queryDto: SearchQueryDto) {
    return this.searchService.searchMaterials(queryDto.q);
  }

  @Get('users')
  @ApiOperation({ summary: 'Search specifically within users' })
  @ApiResponse({ status: 200, description: 'List of matching users.' })
  async searchUsers(@Query() queryDto: SearchQueryDto) {
    return this.searchService.searchUsers(queryDto.q);
  }
}
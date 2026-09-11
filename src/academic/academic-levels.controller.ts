import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Academic Structure & Levels')
@Controller('api/v1/academic-levels')
export class AcademicLevelsController {
  @Get()
  @ApiOperation({ summary: 'Get standardized academic levels for secondary and university tracks' })
  @ApiResponse({ status: 200, description: 'Academic levels list retrieved successfully.' })
  getAcademicLevels() {
    return {
      secondaryLevels: [
        'JSS 1', 'JSS 2', 'JSS 3',
        'SS 1', 'SS 2', 'SS 3'
      ],
      universityLevels: [
        '100 Level',
        '200 Level',
        '300 Level',
        '400 Level',
        '500 Level',
        '600 Level'
      ],
      secondaryStreams: [
        'Science',
        'Arts',
        'Commercial'
      ]
    };
  }
}
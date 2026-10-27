import { BadRequestException, Body, Controller, Delete, Get, Module, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CountsTowardStreak } from '../streak/streak-activity.js';
import { LearnerMaterial, PersonalCourse, PersonalCourseModule } from '../learner-content/entities.js';
import { YoutubeEntity } from '../youtube/entities/youtube.entity.js';
import { AssessmentAttempt, LearnerAssessment, LearningResource, SOURCE_TYPES, YoutubeSessionMessage } from './entities.js';
import { GENERATE_KINDS, LearningService, type GenerateKind } from './learning.service.js';
import { LearnerAssessmentsService } from './assessments.service.js';
import { YoutubeSessionsService } from './youtube-sessions.service.js';
import { SearchEverythingService } from './search-everything.service.js';

// ---------------------------------------------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------------------------------------------

export class GenerateOptionsDto {
  @IsOptional() @IsInt() @Min(1) @Max(60) count?: number;
  @IsOptional() @IsIn(['easy', 'medium', 'hard', 'mixed']) difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  @IsOptional() @IsString() @MaxLength(100) level?: string;
  @IsOptional() @IsString() @MaxLength(60) examGoal?: string;
  @IsOptional() @IsString() @MaxLength(500) objective?: string;
  @IsOptional() @IsString() @MaxLength(120) subject?: string;
  @IsOptional() @IsString() @MaxLength(300) focus?: string;
  @IsOptional() @IsInt() @Min(1) @Max(300) durationMinutes?: number;
  @IsOptional() @IsIn(['after_submit', 'immediate']) feedbackMode?: 'after_submit' | 'immediate';
}

export class GenerateDto {
  /** Client-generated id: retrying with the same id returns the first result instead of generating again. */
  @IsUUID() requestId: string;
  @IsIn(GENERATE_KINDS as unknown as string[]) kind: GenerateKind;
  @IsIn(SOURCE_TYPES as unknown as string[]) sourceType: (typeof SOURCE_TYPES)[number];
  @IsOptional() @IsUUID() sourceId?: string;
  @IsOptional() @IsString() @MaxLength(200000) text?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsUUID() personalCourseId?: string;
  @IsOptional() @IsUUID() moduleId?: string;
  @IsOptional() @ValidateNested() @Type(() => GenerateOptionsDto) options?: GenerateOptionsDto;
}

export class UpdateResourceDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255) title?: string;
  @IsOptional() @IsBoolean() completed?: boolean;
}

export class AnswersDto {
  @IsOptional() @IsObject() answers?: Record<string, string>;
}

export class CreateYoutubeSessionDto {
  @IsString() @MaxLength(500) url: string;
  @IsOptional() @IsString() @MaxLength(255) title?: string;
  @IsOptional() @IsString() @MaxLength(300) goal?: string;
  @IsOptional() @IsString() @MaxLength(100) level?: string;
  @IsOptional() @IsString() @MaxLength(120) subject?: string;
  @IsOptional() @IsUUID() personalCourseId?: string;
}

export class TranscriptDto {
  @IsString() @MinLength(1) @MaxLength(200000) text: string;
}

export class AskDto {
  @IsString() @MinLength(1) @MaxLength(2000) question: string;
}

const uuidOrUndefined = (v: string | undefined, name: string) => {
  if (v !== undefined && !/^[0-9a-f-]{36}$/i.test(v)) throw new BadRequestException(`${name} must be a UUID.`);
  return v;
};

// ---------------------------------------------------------------------------------------------------------------
// Controllers — the signed-in learner's own records only
// ---------------------------------------------------------------------------------------------------------------

@ApiTags('Learning from your material')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/learning')
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  /** Lessons, notes, summaries, study plans, quizzes, mock exams, flashcards or a course plan, from the learner's source. */
  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Post('generate')
  generate(@CurrentUser('id') userId: string, @Body() dto: GenerateDto) {
    return this.learning.generate(userId, dto);
  }

  @Get('resources')
  list(@CurrentUser('id') userId: string, @Query('personalCourseId') personalCourseId?: string, @Query('kind') kind?: string, @Query('materialId') materialId?: string, @Query('youtubeSessionId') youtubeSessionId?: string) {
    return this.learning.listResources(userId, {
      personalCourseId: uuidOrUndefined(personalCourseId, 'personalCourseId'),
      kind: kind?.slice(0, 30),
      materialId: uuidOrUndefined(materialId, 'materialId'),
      youtubeSessionId: uuidOrUndefined(youtubeSessionId, 'youtubeSessionId'),
    });
  }

  @Get('resources/:id')
  get(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.learning.getResource(userId, id);
  }

  @Throttle({ short: { limit: 3, ttl: 2000 }, long: { limit: 40, ttl: 60000 } })
  @Patch('resources/:id')
  update(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateResourceDto) {
    return this.learning.updateResource(userId, id, dto);
  }

  /** Finishing a generated lesson counts towards the learning streak. */
  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 40, ttl: 60000 } })
  @CountsTowardStreak('lesson_completed')
  @Post('resources/:id/complete')
  complete(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.learning.updateResource(userId, id, { completed: true });
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Delete('resources/:id')
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.learning.deleteResource(userId, id);
  }
}

@ApiTags('Your quizzes and mock exams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/learner-assessments')
export class LearnerAssessmentsController {
  constructor(private readonly assessments: LearnerAssessmentsService) {}

  @Get()
  list(@CurrentUser('id') userId: string, @Query('kind') kind?: string, @Query('personalCourseId') personalCourseId?: string) {
    if (kind !== undefined && kind !== 'quiz' && kind !== 'exam') throw new BadRequestException('kind must be quiz or exam.');
    return this.assessments.list(userId, kind as 'quiz' | 'exam' | undefined, uuidOrUndefined(personalCourseId, 'personalCourseId'));
  }

  // static routes before ':id'
  @Get('attempts')
  attempts(@CurrentUser('id') userId: string, @Query('assessmentId') assessmentId?: string) {
    return this.assessments.attemptsFor(userId, uuidOrUndefined(assessmentId, 'assessmentId'));
  }

  @Get('attempts/:attemptId')
  attempt(@CurrentUser('id') userId: string, @Param('attemptId', ParseUUIDPipe) attemptId: string) {
    return this.assessments.attempt(userId, attemptId);
  }

  @Throttle({ short: { limit: 4, ttl: 2000 }, long: { limit: 120, ttl: 60000 } })
  @Patch('attempts/:attemptId')
  save(@CurrentUser('id') userId: string, @Param('attemptId', ParseUUIDPipe) attemptId: string, @Body() dto: AnswersDto) {
    LearnerAssessmentsService.assertAnswers(dto.answers);
    return this.assessments.save(userId, attemptId, dto.answers ?? {});
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @CountsTowardStreak('quiz_submitted')
  @Post('attempts/:attemptId/submit')
  submit(@CurrentUser('id') userId: string, @Param('attemptId', ParseUUIDPipe) attemptId: string, @Body() dto: AnswersDto) {
    LearnerAssessmentsService.assertAnswers(dto.answers);
    return this.assessments.submit(userId, attemptId, dto.answers);
  }

  @Get(':id')
  get(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.get(userId, id);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 30, ttl: 60000 } })
  @Post(':id/attempts')
  start(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.start(userId, id);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessments.remove(userId, id);
  }
}

@ApiTags('YouTube learning sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/youtube-sessions')
export class YoutubeSessionsController {
  constructor(private readonly sessions: YoutubeSessionsService) {}

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateYoutubeSessionDto) {
    return this.sessions.create(userId, dto);
  }

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.sessions.list(userId);
  }

  @Get(':id')
  get(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.get(userId, id);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.remove(userId, id);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Put(':id/transcript')
  setTranscript(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TranscriptDto) {
    return this.sessions.setTranscript(userId, id, dto.text);
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 6, ttl: 60000 } })
  @Post(':id/transcript/fetch')
  refetch(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.refetchTranscript(userId, id);
  }

  @Get(':id/messages')
  messages(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.listMessages(userId, id);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Post(':id/ask')
  ask(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AskDto) {
    return this.sessions.ask(userId, id, dto.question);
  }
}

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/search')
export class SearchEverythingController {
  constructor(private readonly search: SearchEverythingService) {}

  /** One search over the catalogue and the learner's own content. */
  @Throttle({ short: { limit: 4, ttl: 2000 }, long: { limit: 90, ttl: 60000 } })
  @Get('everything')
  everything(@CurrentUser('id') userId: string, @Query('q') q = '') {
    return this.search.search(userId, q);
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([LearningResource, LearnerAssessment, AssessmentAttempt, YoutubeSessionMessage, YoutubeEntity, LearnerMaterial, PersonalCourse, PersonalCourseModule]),
  ],
  controllers: [LearningController, LearnerAssessmentsController, YoutubeSessionsController, SearchEverythingController],
  providers: [LearningService, LearnerAssessmentsService, YoutubeSessionsService, SearchEverythingService],
})
export class LearningModule {}

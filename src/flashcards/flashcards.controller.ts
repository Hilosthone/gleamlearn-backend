// // src/flashcards/flashcards.controller.ts
// import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
// import { FlashcardsService } from './flashcards.service.js';
// import { CreateFlashcardDto, UpdateFlashcardDto, ReviewFlashcardDto } from './dto/flashcard.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// @ApiTags('Flashcards')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('flashcards')
// export class FlashcardsController {
//   constructor(private readonly flashcardsService: FlashcardsService) {}

//   @Post()
//   create(@CurrentUser('id') userId: string, @Body() dto: CreateFlashcardDto) {
//     return this.flashcardsService.createFlashcard(userId, dto);
//   }

//   @Get()
//   findAll(@CurrentUser('id') userId: string) {
//     return this.flashcardsService.findAllFlashcards(userId);
//   }

//   @Get('review/today')
//   getReviewToday(@CurrentUser('id') userId: string) {
//     return this.flashcardsService.getCardsDueToday(userId);
//   }

//   @Get(':id')
//   findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
//     return this.flashcardsService.findOneFlashcard(id, userId);
//   }

//   @Patch(':id')
//   update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateFlashcardDto) {
//     return this.flashcardsService.updateFlashcard(id, userId, dto);
//   }

//   @Delete(':id')
//   remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
//     return this.flashcardsService.removeFlashcard(id, userId);
//   }

//   @Post(':id/review')
//   reviewCard(
//     @Param('id') id: string,
//     @CurrentUser('id') userId: string,
//     @Body() dto: ReviewFlashcardDto,
//   ) {
//     return this.flashcardsService.reviewFlashcard(id, userId, dto);
//   }
// }


// src/flashcards/flashcards.controller.ts
import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FlashcardsService } from './flashcards.service.js';
import { CreateFlashcardDto, UpdateFlashcardDto, ReviewFlashcardDto } from './dto/flashcard.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Flashcards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('flashcards')
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new flashcard' })
  @ApiResponse({ status: 201, description: 'Flashcard created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateFlashcardDto) {
    return this.flashcardsService.createFlashcard(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all flashcards for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of flashcards retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(@CurrentUser('id') userId: string) {
    return this.flashcardsService.findAllFlashcards(userId);
  }

  @Get('review/today')
  @ApiOperation({ summary: 'Get flashcards due for review today (Spaced Repetition)' })
  @ApiResponse({ status: 200, description: 'List of due flashcards retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getReviewToday(@CurrentUser('id') userId: string) {
    return this.flashcardsService.getCardsDueToday(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific flashcard by ID' })
  @ApiResponse({ status: 200, description: 'Flashcard found.' })
  @ApiResponse({ status: 404, description: 'Flashcard not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.flashcardsService.findOneFlashcard(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing flashcard' })
  @ApiResponse({ status: 200, description: 'Flashcard updated successfully.' })
  @ApiResponse({ status: 404, description: 'Flashcard not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateFlashcardDto) {
    return this.flashcardsService.updateFlashcard(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a flashcard' })
  @ApiResponse({ status: 200, description: 'Flashcard deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Flashcard not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.flashcardsService.removeFlashcard(id, userId);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Submit review response for a flashcard (Leitner system progression)' })
  @ApiResponse({ status: 200, description: 'Flashcard review processed and next interval updated.' })
  @ApiResponse({ status: 404, description: 'Flashcard not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  reviewCard(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReviewFlashcardDto,
  ) {
    return this.flashcardsService.reviewFlashcard(id, userId, dto);
  }
}
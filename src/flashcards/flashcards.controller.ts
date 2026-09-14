// src/flashcards/flashcards.controller.ts
import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
  create(@CurrentUser('id') userId: string, @Body() dto: CreateFlashcardDto) {
    return this.flashcardsService.createFlashcard(userId, dto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.flashcardsService.findAllFlashcards(userId);
  }

  @Get('review/today')
  getReviewToday(@CurrentUser('id') userId: string) {
    return this.flashcardsService.getCardsDueToday(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.flashcardsService.findOneFlashcard(id, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateFlashcardDto) {
    return this.flashcardsService.updateFlashcard(id, userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.flashcardsService.removeFlashcard(id, userId);
  }

  @Post(':id/review')
  reviewCard(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReviewFlashcardDto,
  ) {
    return this.flashcardsService.reviewFlashcard(id, userId, dto);
  }
}
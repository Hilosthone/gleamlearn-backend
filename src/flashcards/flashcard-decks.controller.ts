// src/flashcards/flashcard-decks.controller.ts
import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FlashcardsService } from './flashcards.service.js';
import { CreateDeckDto, UpdateDeckDto } from './dto/deck.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Flashcard Decks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('flashcard-decks')
export class FlashcardDecksController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateDeckDto) {
    return this.flashcardsService.createDeck(userId, dto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.flashcardsService.findAllDecks(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.flashcardsService.findOneDeck(id, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateDeckDto) {
    return this.flashcardsService.updateDeck(id, userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.flashcardsService.removeDeck(id, userId);
  }
}
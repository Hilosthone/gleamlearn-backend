// // src/flashcards/flashcard-decks.controller.ts
// import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
// import { FlashcardsService } from './flashcards.service.js';
// import { CreateDeckDto, UpdateDeckDto } from './dto/deck.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// @ApiTags('Flashcard Decks')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('flashcard-decks')
// export class FlashcardDecksController {
//   constructor(private readonly flashcardsService: FlashcardsService) {}

//   @Post()
//   create(@CurrentUser('id') userId: string, @Body() dto: CreateDeckDto) {
//     return this.flashcardsService.createDeck(userId, dto);
//   }

//   @Get()
//   findAll(@CurrentUser('id') userId: string) {
//     return this.flashcardsService.findAllDecks(userId);
//   }

//   @Get(':id')
//   findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
//     return this.flashcardsService.findOneDeck(id, userId);
//   }

//   @Patch(':id')
//   update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateDeckDto) {
//     return this.flashcardsService.updateDeck(id, userId, dto);
//   }

//   @Delete(':id')
//   remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
//     return this.flashcardsService.removeDeck(id, userId);
//   }
// }


// // src/flashcards/flashcard-decks.controller.ts
// import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
// import { FlashcardsService } from './flashcards.service.js';
// import { CreateDeckDto, UpdateDeckDto } from './dto/deck.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// @ApiTags('Flashcard Decks')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('flashcard-decks')
// export class FlashcardDecksController {
//   constructor(private readonly flashcardsService: FlashcardsService) {}

//   @Post()
//   @ApiOperation({ summary: 'Create a new flashcard deck' })
//   @ApiResponse({ status: 201, description: 'Flashcard deck created successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   create(@CurrentUser('id') userId: string, @Body() dto: CreateDeckDto) {
//     return this.flashcardsService.createDeck(userId, dto);
//   }

//   @Get()
//   @ApiOperation({ summary: 'Retrieve all flashcard decks for the authenticated user' })
//   @ApiResponse({ status: 200, description: 'List of flashcard decks retrieved successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   findAll(@CurrentUser('id') userId: string) {
//     return this.flashcardsService.findAllDecks(userId);
//   }

//   @Get(':id')
//   @ApiOperation({ summary: 'Get a specific flashcard deck by ID' })
//   @ApiResponse({ status: 200, description: 'Flashcard deck found.' })
//   @ApiResponse({ status: 404, description: 'Flashcard deck not found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
//     return this.flashcardsService.findOneDeck(id, userId);
//   }

//   @Patch(':id')
//   @ApiOperation({ summary: 'Update an existing flashcard deck' })
//   @ApiResponse({ status: 200, description: 'Flashcard deck updated successfully.' })
//   @ApiResponse({ status: 404, description: 'Flashcard deck not found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateDeckDto) {
//     return this.flashcardsService.updateDeck(id, userId, dto);
//   }

//   @Delete(':id')
//   @ApiOperation({ summary: 'Delete a flashcard deck' })
//   @ApiResponse({ status: 200, description: 'Flashcard deck deleted successfully.' })
//   @ApiResponse({ status: 404, description: 'Flashcard deck not found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
//     return this.flashcardsService.removeDeck(id, userId);
//   }
// }



// src/flashcards/flashcard-decks.controller.ts
import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
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

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Post()
  @ApiOperation({ summary: 'Create a new flashcard deck' })
  @ApiResponse({ status: 201, description: 'Flashcard deck created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateDeckDto) {
    return this.flashcardsService.createDeck(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all flashcard decks for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of flashcard decks retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(@CurrentUser('id') userId: string) {
    return this.flashcardsService.findAllDecks(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific flashcard deck by ID' })
  @ApiResponse({ status: 200, description: 'Flashcard deck found.' })
  @ApiResponse({ status: 404, description: 'Flashcard deck not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.flashcardsService.findOneDeck(id, userId);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing flashcard deck' })
  @ApiResponse({ status: 200, description: 'Flashcard deck updated successfully.' })
  @ApiResponse({ status: 404, description: 'Flashcard deck not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateDeckDto) {
    return this.flashcardsService.updateDeck(id, userId, dto);
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 5, ttl: 60000 } })
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a flashcard deck' })
  @ApiResponse({ status: 200, description: 'Flashcard deck deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Flashcard deck not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.flashcardsService.removeDeck(id, userId);
  }
}
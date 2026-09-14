// // src/flashcards/flashcards.module.ts
// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { FlashcardsService } from './flashcards.service.js';
// import { FlashcardsController } from './flashcards.controller.js';
// import { FlashcardDecksController } from './flashcard-decks.controller.js';
// import { Deck } from './entities/deck.entity.js';
// import { Flashcard } from './entities/flashcard.entity.js';

// @Module({
//   imports: [TypeOrmModule.forFeature([Deck, Flashcard])],
//   controllers: [FlashcardsController, FlashcardDecksController],
//   providers: [FlashcardsService],
//   exports: [FlashcardsService],
// })
// export class FlashcardsModule {}


// src/flashcards/flashcards.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlashcardsService } from './flashcards.service.js';
import { FlashcardsController } from './flashcards.controller.js';
import { FlashcardDecksController } from './flashcard-decks.controller.js';
import { Deck } from './entities/deck.entity.js';
import { Flashcard } from './entities/flashcard.entity.js';
import { AuthModule } from '../auth/auth.module.js'; // <-- Import AuthModule so guards have access to passport/jwt services

@Module({
  imports: [
    TypeOrmModule.forFeature([Deck, Flashcard]),
    AuthModule, // <-- Required here so controllers using JwtAuthGuard can resolve auth dependencies
  ],
  controllers: [FlashcardsController, FlashcardDecksController],
  providers: [FlashcardsService],
  exports: [FlashcardsService],
})
export class FlashcardsModule {}
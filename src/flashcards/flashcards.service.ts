// src/flashcards/flashcards.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull, Or, In } from 'typeorm';
import { Deck } from './entities/deck.entity.js';
import { Flashcard } from './entities/flashcard.entity.js';
import { CreateDeckDto, UpdateDeckDto } from './dto/deck.dto.js';
import { CreateFlashcardDto, UpdateFlashcardDto, ReviewFlashcardDto } from './dto/flashcard.dto.js';
import { calculateSM2 } from './utils/sm2.util.js';

@Injectable()
export class FlashcardsService {
  constructor(
    @InjectRepository(Deck)
    private readonly deckRepository: Repository<Deck>,
    @InjectRepository(Flashcard)
    private readonly flashcardRepository: Repository<Flashcard>,
  ) {}

  // --- DECKS ---
  async createDeck(userId: string, dto: CreateDeckDto) {
    const deck = this.deckRepository.create({ ...dto, userId });
    return await this.deckRepository.save(deck);
  }

  async findAllDecks(userId: string) {
    return await this.deckRepository.find({
      where: { userId },
      relations: { cards: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneDeck(id: string, userId: string) {
    const deck = await this.deckRepository.findOne({
      where: { id },
      relations: { cards: true },
    });
    if (!deck) {
      throw new NotFoundException('Flashcard deck not found');
    }
    if (deck.userId !== userId) {
      throw new ForbiddenException('Access denied to this deck');
    }
    return deck;
  }

  async updateDeck(id: string, userId: string, dto: UpdateDeckDto) {
    const deck = await this.findOneDeck(id, userId);
    Object.assign(deck, dto);
    return await this.deckRepository.save(deck);
  }

  async removeDeck(id: string, userId: string) {
    const deck = await this.findOneDeck(id, userId);
    await this.deckRepository.remove(deck);
    return { message: 'Deck deleted successfully' };
  }

  // --- FLASHCARDS ---
  async createFlashcard(userId: string, dto: CreateFlashcardDto) {
    await this.findOneDeck(dto.deckId, userId); // verify deck ownership
    const card = this.flashcardRepository.create(dto);
    return await this.flashcardRepository.save(card);
  }

  async findAllFlashcards(userId: string) {
    const decks = await this.deckRepository.find({ 
      where: { userId }, 
      select: { id: true } 
    });
    const deckIds = decks.map((d) => d.id);
    if (deckIds.length === 0) return [];

    return await this.flashcardRepository.find({
      where: { deckId: In(deckIds) },
      relations: { deck: true },
    });
  }

  async findOneFlashcard(id: string, userId: string) {
    const card = await this.flashcardRepository.findOne({
      where: { id },
      relations: { deck: true },
    });
    if (!card) {
      throw new NotFoundException('Flashcard not found');
    }
    if (card.deck.userId !== userId) {
      throw new ForbiddenException('Access denied to this flashcard');
    }
    return card;
  }

  async updateFlashcard(id: string, userId: string, dto: UpdateFlashcardDto) {
    const card = await this.findOneFlashcard(id, userId);
    if (dto.deckId && dto.deckId !== card.deckId) {
      await this.findOneDeck(dto.deckId, userId);
    }
    Object.assign(card, dto);
    return await this.flashcardRepository.save(card);
  }

  async removeFlashcard(id: string, userId: string) {
    const card = await this.findOneFlashcard(id, userId);
    await this.flashcardRepository.remove(card);
    return { message: 'Flashcard deleted successfully' };
  }

  // --- REVIEW & SM-2 ---
  async reviewFlashcard(id: string, userId: string, dto: ReviewFlashcardDto) {
    const card = await this.findOneFlashcard(id, userId);
    const sm2Result = calculateSM2(
      dto.quality,
      card.repetitions,
      card.easeFactor,
      card.interval,
    );

    card.interval = sm2Result.interval;
    card.repetitions = sm2Result.repetitions;
    card.easeFactor = sm2Result.easeFactor;
    card.nextReviewDate = sm2Result.nextReviewDate;

    await this.flashcardRepository.save(card);
    return { message: 'Review recorded successfully', data: card };
  }

  async getCardsDueToday(userId: string) {
    const decks = await this.deckRepository.find({ 
      where: { userId }, 
      select: { id: true } 
    });
    const deckIds = decks.map((d) => d.id);
    if (deckIds.length === 0) return [];

    const now = new Date();
    return await this.flashcardRepository.find({
      where: {
        deckId: In(deckIds),
        nextReviewDate: Or(LessThanOrEqual(now), IsNull()),
      },
      relations: { deck: true },
    });
  }
}
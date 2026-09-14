// // // src/flashcards/entities/flashcard.entity.ts
// // import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
// // import { Deck } from './deck.entity.js';

// // @Entity('flashcards')
// // export class Flashcard {
// //   @PrimaryGeneratedColumn('uuid')
// //   id: string;

// //   @Column({ type: 'text' })
// //   question: string;

// //   @Column({ type: 'text' })
// //   answer: string;

// //   @Column({ type: 'float', default: 2.5 })
// //   easeFactor: number;

// //   @Column({ type: 'int', default: 0 })
// //   repetitions: number;

// //   @Column({ type: 'int', default: 0 })
// //   interval: number;

// //   @Column({ type: 'timestamp', nullable: true })
// //   nextReviewDate: Date;

// //   @ManyToOne(() => Deck, (deck) => deck.cards, { onDelete: 'CASCADE' })
// //   deck: Deck;

// //   @Column()
// //   deckId: string;

// //   @CreateDateColumn()
// //   createdAt: Date;

// //   @UpdateDateColumn()
// //   updatedAt: Date;
// // }


// // src/flashcards/entities/flashcard.entity.ts
// import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
// import { Deck } from './deck.entity.js';

// @Entity('flashcards')
// export class Flashcard {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column({ type: 'text' })
//   question: string;

//   @Column({ type: 'text' })
//   answer: string;

//   @Column({ type: 'float', default: 2.5 })
//   easeFactor: number;

//   @Column({ type: 'int', default: 0 })
//   repetitions: number;

//   @Column({ type: 'int', default: 0 })
//   interval: number;

//   @Column({ type: 'timestamp', nullable: true })
//   nextReviewDate: Date;

//   @ManyToOne(() => Deck, (deck) => deck.cards, { onDelete: 'CASCADE' })
//   deck: Deck;

//   @Column()
//   deckId: string;

//   @CreateDateColumn()
//   createdAt: Date;

//   @UpdateDateColumn()
//   updatedAt: Date;
// }


// src/flashcards/entities/flashcard.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import type { Deck } from './deck.entity.js';
import { Deck as DeckEntity } from './deck.entity.js';

@Entity('flashcards')
export class Flashcard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'float', default: 2.5 })
  easeFactor: number;

  @Column({ type: 'int', default: 0 })
  repetitions: number;

  @Column({ type: 'int', default: 0 })
  interval: number;

  @Column({ type: 'timestamp', nullable: true })
  nextReviewDate: Date;

  @ManyToOne(() => DeckEntity, (deck) => deck.cards, { onDelete: 'CASCADE' })
  deck: Deck;

  @Column()
  deckId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
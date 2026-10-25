// src/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AccountStatusService } from '../auth/account-status.service.js';
import { User } from '../auth/entities/user.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { Topic } from '../courses/entities/topic.entity.js';
import { Question } from '../questions/entities/question.entity.js';
import { NoteEntity } from '../notes/entities/note.entity.js';

const LIMIT = 10;

/** `%`, `_` and `\` in the learner's text are matched literally (ILIKE ... ESCAPE '\'). */
export function likePattern(query: string): string {
  return `%${query.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * Searches the tables that actually hold the data (TypeORM). Previously it used Prisma models that do not exist
 * in prisma/schema.prisma (course, topic, question, studyMaterial), so every search except users failed with 500.
 *
 * - questions: never returns correctAnswer / explanation (the bank stores them).
 * - materials: the learner's OWN notes. Uploaded files are not searched: they have no owner column (B4), so
 *   searching them would expose other learners' files.
 * - users: id, full name and username only (the email was returned before); deleted and frozen accounts excluded.
 */
@Injectable()
export class SearchService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly accountStatus: AccountStatusService,
  ) {}

  async searchAll(query: string, userId?: string) {
    const [courses, topics, questions, materials, users] = await Promise.all([
      this.searchCourses(query),
      this.searchTopics(query),
      this.searchQuestions(query),
      this.searchMaterials(query, userId),
      this.searchUsers(query),
    ]);
    return { query, userId: userId ?? null, results: { courses, topics, questions, materials, users } };
  }

  async searchCourses(query: string) {
    return this.dataSource
      .getRepository(Course)
      .createQueryBuilder('c')
      .select(['c.id', 'c.title', 'c.description', 'c.track', 'c.level', 'c.departmentId', 'c.createdAt', 'c.updatedAt'])
      .where("(c.title ILIKE :p ESCAPE '\\' OR c.description ILIKE :p ESCAPE '\\')", { p: likePattern(query) })
      .orderBy('c.title', 'ASC')
      .take(LIMIT)
      .getMany();
  }

  async searchTopics(query: string) {
    return this.dataSource
      .getRepository(Topic)
      .createQueryBuilder('t')
      .select(['t.id', 't.title', 't.description', 't.order', 't.courseId', 't.createdAt', 't.updatedAt'])
      .where("t.title ILIKE :p ESCAPE '\\'", { p: likePattern(query) })
      .orderBy('t.title', 'ASC')
      .take(LIMIT)
      .getMany();
  }

  async searchQuestions(query: string) {
    return this.dataSource
      .getRepository(Question)
      .createQueryBuilder('q')
      .select(['q.id', 'q.courseId', 'q.subject', 'q.topic', 'q.difficulty', 'q.type', 'q.examination', 'q.year', 'q.questionText'])
      .where("q.questionText ILIKE :p ESCAPE '\\'", { p: likePattern(query) })
      .orderBy('q.createdAt', 'DESC')
      .take(LIMIT)
      .getMany();
  }

  async searchMaterials(query: string, userId?: string) {
    if (!userId) return [];
    return this.dataSource
      .getRepository(NoteEntity)
      .createQueryBuilder('n')
      .select(['n.id', 'n.title', 'n.courseId', 'n.tags', 'n.createdAt', 'n.updatedAt'])
      .where('n.userId = :userId', { userId })
      .andWhere("(n.title ILIKE :p ESCAPE '\\' OR n.content ILIKE :p ESCAPE '\\')", { p: likePattern(query) })
      .orderBy('n.updatedAt', 'DESC')
      .take(LIMIT)
      .getMany();
  }

  async searchUsers(query: string) {
    const users = await this.dataSource
      .getRepository(User)
      .createQueryBuilder('u')
      .select(['u.id', 'u.fullName', 'u.username'])
      .where("(u.fullName ILIKE :p ESCAPE '\\' OR u.username ILIKE :p ESCAPE '\\')", { p: likePattern(query) })
      .orderBy('u.username', 'ASC')
      .take(LIMIT * 2) // room for hidden (deleted / frozen) accounts
      .getMany();
    const visible: Array<Pick<User, 'id' | 'fullName' | 'username'>> = [];
    for (const u of users) {
      const status = await this.accountStatus.getStatus(u.id);
      if (status.exists && !status.deleted && !status.frozen) visible.push({ id: u.id, fullName: u.fullName, username: u.username });
      if (visible.length === LIMIT) break;
    }
    return visible;
  }
}

// src/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Performs concurrent searches across all 5 categories (courses, topics, questions, materials, users).
   * Accepts an optional userId for context or tracking.
   */
  async searchAll(query: string, userId?: string) {
    const [courses, topics, questions, materials, users] = await Promise.all([
      this.searchCourses(query),
      this.searchTopics(query),
      this.searchQuestions(query),
      this.searchMaterials(query),
      this.searchUsers(query),
    ]);

    return {
      query,
      userId: userId ?? null,
      results: {
        courses,
        topics,
        questions,
        materials,
        users,
      },
    };
  }

  /**
   * Searches courses by title or description with case-insensitive matching.
   */
  async searchCourses(query: string) {
    return this.prisma.course.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
  }

  /**
   * Searches topics by title with case-insensitive matching.
   */
  async searchTopics(query: string) {
    return this.prisma.topic.findMany({
      where: {
        title: { contains: query, mode: 'insensitive' },
      },
      take: 10,
    });
  }

  /**
   * Searches questions by content with case-insensitive matching.
   */
  async searchQuestions(query: string) {
    return this.prisma.question.findMany({
      where: {
        content: { contains: query, mode: 'insensitive' },
      },
      take: 10,
    });
  }

  /**
   * Searches study materials by title or description with case-insensitive matching.
   */
  async searchMaterials(query: string) {
    return this.prisma.studyMaterial.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
  }

  /**
   * Searches users by fullName or username, safely omitting sensitive fields like passwordHash.
   */
  async searchUsers(query: string) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { fullName: { contains: query, mode: 'insensitive' } },
          { username: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
      },
      take: 10,
    });
  }
}
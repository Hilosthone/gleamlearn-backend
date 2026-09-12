// import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { LibraryCourse, LibraryFavorite } from './entities/library-item.entity.js';

// @Injectable()
// export class LibraryService {
//   constructor(
//     @InjectRepository(LibraryCourse) private libraryCourseRepo: Repository<LibraryCourse>,
//     @InjectRepository(LibraryFavorite) private libraryFavoriteRepo: Repository<LibraryFavorite>,
//   ) {}

//   async getLibrarySummary(userId: string) {
//     const courses = await this.libraryCourseRepo.count({ where: { userId } });
//     const favorites = await this.libraryFavoriteRepo.count({ where: { userId } });
//     return {
//       totalSavedCourses: courses,
//       totalFavorites: favorites,
//       message: 'Library overview retrieved successfully',
//     };
//   }

//   async getSavedCourses(userId: string) {
//     return this.libraryCourseRepo.find({ where: { userId }, order: { savedAt: 'DESC' } });
//   }

//   async saveCourse(userId: string, courseId: string) {
//     try {
//       const item = this.libraryCourseRepo.create({ userId, courseId });
//       return await this.libraryCourseRepo.save(item);
//     } catch {
//       throw new ConflictException('Course already exists in your library');
//     }
//   }

//   async removeSavedCourse(userId: string, courseId: string) {
//     const result = await this.libraryCourseRepo.delete({ userId, courseId });
//     if (result.affected === 0) throw new NotFoundException('Saved course not found in library');
//     return { message: 'Course removed from library' };
//   }

//   async addFavorite(userId: string, referenceId: string, type: string = 'MATERIAL') {
//     try {
//       const favorite = this.libraryFavoriteRepo.create({ userId, referenceId, type });
//       return await this.libraryFavoriteRepo.save(favorite);
//     } catch {
//       throw new ConflictException('Item already favorited');
//     }
//   }

//   async removeFavorite(userId: string, referenceId: string) {
//     const result = await this.libraryFavoriteRepo.delete({ userId, referenceId });
//     if (result.affected === 0) throw new NotFoundException('Favorite item not found');
//     return { message: 'Removed from favorites' };
//   }

//   // Filtered library fetch wrappers
//   async getLibraryItemsByType(userId: string, type: string) {
//     return this.libraryFavoriteRepo.find({ where: { userId, type } });
//   }
// }

// src/library/library.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryCourse, LibraryFavorite } from './entities/library-item.entity.js';
import { FavoriteType } from './dto/add-favorite.dto.js';

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(LibraryCourse) private libraryCourseRepo: Repository<LibraryCourse>,
    @InjectRepository(LibraryFavorite) private libraryFavoriteRepo: Repository<LibraryFavorite>,
  ) {}

  // Retrieves an overview count of all saved items for the student
  async getLibrarySummary(userId: string) {
    const courses = await this.libraryCourseRepo.count({ where: { userId } });
    const favorites = await this.libraryFavoriteRepo.count({ where: { userId } });
    return {
      totalSavedCourses: courses,
      totalFavorites: favorites,
      message: 'Library overview retrieved successfully',
    };
  }

  // Fetches all courses saved by the user, ordered by most recently saved
  async getSavedCourses(userId: string) {
    return this.libraryCourseRepo.find({ where: { userId }, order: { savedAt: 'DESC' } });
  }

  // Persists a course into the student's library
  async saveCourse(userId: string, courseId: string) {
    try {
      const item = this.libraryCourseRepo.create({ userId, courseId });
      return await this.libraryCourseRepo.save(item);
    } catch {
      throw new ConflictException('Course already exists in your library');
    }
  }

  // Removes a course from the student's library
  async removeSavedCourse(userId: string, courseId: string) {
    const result = await this.libraryCourseRepo.delete({ userId, courseId });
    if (result.affected === 0) throw new NotFoundException('Saved course not found in library');
    return { message: 'Course removed from library' };
  }

  // Adds an academic reference (topic, material, quiz, test, or exam) to favorites
  async addFavorite(userId: string, referenceId: string, type: FavoriteType | string = FavoriteType.MATERIAL) {
    try {
      const favorite = this.libraryFavoriteRepo.create({ userId, referenceId, type });
      return await this.libraryFavoriteRepo.save(favorite);
    } catch {
      throw new ConflictException('Item already favorited');
    }
  }

  // Removes a specific item from favorites by its reference ID
  async removeFavorite(userId: string, referenceId: string) {
    const result = await this.libraryFavoriteRepo.delete({ userId, referenceId });
    if (result.affected === 0) throw new NotFoundException('Favorite item not found');
    return { message: 'Removed from favorites' };
  }

  // Retrieves filtered favorite records based on asset type (e.g., 'TOPIC', 'QUIZ', etc.)
  async getLibraryItemsByType(userId: string, type: FavoriteType | string) {
    return this.libraryFavoriteRepo.find({ where: { userId, type } });
  }
}
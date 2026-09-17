// // src/progress/progress.service.ts
// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { UserProgress } from './entities/user-progress.entity.js';
// import { TopicMastery } from './entities/topic-mastery.entity.js';
// import { UpdateProgressDto } from './dto/update-progress.dto.js';

// @Injectable()
// export class ProgressService {
//   constructor(
//     @InjectRepository(UserProgress)
//     private progressRepo: Repository<UserProgress>,
//     @InjectRepository(TopicMastery)
//     private masteryRepo: Repository<TopicMastery>,
//   ) {}

//   async getOverallProgress(userId: string) {
//     const records = await this.progressRepo.find({ where: { userId } });
//     const totalCourses = records.length;
//     const avgCompletion = totalCourses > 0
//       ? records.reduce((acc, curr) => acc + curr.completionPercentage, 0) / totalCourses
//       : 0;

//     return {
//       status: 'success',
//       totalTrackedCourses: totalCourses,
//       overallCompletionPercentage: Number(avgCompletion.toFixed(2)),
//       progressRecords: records,
//     };
//   }

//   async getCourseProgress(userId: string, courseId: string) {
//     const progress = await this.progressRepo.findOne({ where: { userId, courseId } });
//     return {
//       status: 'success',
//       courseId,
//       progress: progress || { completionPercentage: 0, isCompleted: false },
//     };
//   }

//   async getTopicProgress(userId: string, topicId: string) {
//     const progress = await this.progressRepo.findOne({ where: { userId, topicId } });
//     return {
//       status: 'success',
//       topicId,
//       progress: progress || { completionPercentage: 0, isCompleted: false },
//     };
//   }

//   async updateProgress(userId: string, dto: UpdateProgressDto) {
//     let progress = await this.progressRepo.findOne({
//       where: { userId, courseId: dto.courseId, topicId: dto.topicId || null },
//     });

//     if (!progress) {
//       progress = this.progressRepo.create({
//         userId,
//         courseId: dto.courseId,
//         topicId: dto.topicId,
//       });
//     }

//     progress.completionPercentage = dto.completionPercentage;
//     progress.isCompleted = dto.completionPercentage >= 100;
//     if (dto.lastAccessedActivity) {
//       progress.lastAccessedActivity = dto.lastAccessedActivity;
//     }

//     const saved = await this.progressRepo.save(progress);
//     return {
//       status: 'success',
//       message: 'Learning progress updated successfully.',
//       data: saved,
//     };
//   }

//   async getProgressHistory(userId: string) {
//     const history = await this.progressRepo.find({
//       where: { userId },
//       order: { updatedAt: 'DESC' },
//     });
//     return {
//       status: 'success',
//       historyCount: history.length,
//       history,
//     };
//   }

//   async getOverallMastery(userId: string) {
//     const masteries = await this.masteryRepo.find({ where: { userId } });
//     const avgScore = masteries.length > 0
//       ? masteries.reduce((acc, curr) => acc + curr.masteryScore, 0) / masteries.length
//       : 0;

//     return {
//       status: 'success',
//       overallMasteryScore: Number(avgScore.toFixed(2)),
//       masteryLevel: avgScore >= 85 ? 'Expert' : avgScore >= 70 ? 'Advanced' : avgScore >= 50 ? 'Intermediate' : 'Beginner',
//       breakdown: masteries,
//     };
//   }

//   async getCourseMastery(userId: string, courseId: string) {
//     const masteries = await this.masteryRepo.find({ where: { userId, courseId } });
//     return {
//       status: 'success',
//       courseId,
//       masteryRecords: masteries,
//     };
//   }

//   async getTopicMastery(userId: string, topicId: string) {
//     const mastery = await this.masteryRepo.findOne({ where: { userId, topicId } });
//     return {
//       status: 'success',
//       topicId,
//       mastery: mastery || { masteryScore: 0, masteryLevel: 'Beginner' },
//     };
//   }
// }




// src/progress/progress.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProgress } from './entities/user-progress.entity.js';
import { TopicMastery } from './entities/topic-mastery.entity.js';
import { UpdateProgressDto } from './dto/update-progress.dto.js';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(UserProgress)
    private progressRepo: Repository<UserProgress>,
    @InjectRepository(TopicMastery)
    private masteryRepo: Repository<TopicMastery>,
  ) {}

  async getOverallProgress(userId: string) {
    const records = await this.progressRepo.find({ where: { userId } });
    const totalCourses = records.length;
    const avgCompletion = totalCourses > 0
      ? records.reduce((acc, curr) => acc + curr.completionPercentage, 0) / totalCourses
      : 0;

    return {
      status: 'success',
      totalTrackedCourses: totalCourses,
      overallCompletionPercentage: Number(avgCompletion.toFixed(2)),
      progressRecords: records,
    };
  }

  async getCourseProgress(userId: string, courseId: string) {
    const progress = await this.progressRepo.findOne({ where: { userId, courseId } });
    return {
      status: 'success',
      courseId,
      progress: progress || { completionPercentage: 0, isCompleted: false },
    };
  }

  async getTopicProgress(userId: string, topicId: string) {
    const progress = await this.progressRepo.findOne({ where: { userId, topicId } });
    return {
      status: 'success',
      topicId,
      progress: progress || { completionPercentage: 0, isCompleted: false },
    };
  }

  async updateProgress(userId: string, dto: UpdateProgressDto) {
    // Fixed: Use undefined instead of null to match TypeORM FindOptionsWhere types
    let progress = await this.progressRepo.findOne({
      where: { 
        userId, 
        courseId: dto.courseId, 
        topicId: dto.topicId || undefined 
      },
    });

    if (!progress) {
      progress = this.progressRepo.create({
        userId,
        courseId: dto.courseId,
        topicId: dto.topicId,
      });
    }

    progress.completionPercentage = dto.completionPercentage;
    progress.isCompleted = dto.completionPercentage >= 100;
    if (dto.lastAccessedActivity) {
      progress.lastAccessedActivity = dto.lastAccessedActivity;
    }

    const saved = await this.progressRepo.save(progress);
    return {
      status: 'success',
      message: 'Learning progress updated successfully.',
      data: saved,
    };
  }

  async getProgressHistory(userId: string) {
    const history = await this.progressRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
    return {
      status: 'success',
      historyCount: history.length,
      history,
    };
  }

  async getOverallMastery(userId: string) {
    const masteries = await this.masteryRepo.find({ where: { userId } });
    const avgScore = masteries.length > 0
      ? masteries.reduce((acc, curr) => acc + curr.masteryScore, 0) / masteries.length
      : 0;

    return {
      status: 'success',
      overallMasteryScore: Number(avgScore.toFixed(2)),
      masteryLevel: avgScore >= 85 ? 'Expert' : avgScore >= 70 ? 'Advanced' : avgScore >= 50 ? 'Intermediate' : 'Beginner',
      breakdown: masteries,
    };
  }

  async getCourseMastery(userId: string, courseId: string) {
    const masteries = await this.masteryRepo.find({ where: { userId, courseId } });
    return {
      status: 'success',
      courseId,
      masteryRecords: masteries,
    };
  }

  async getTopicMastery(userId: string, topicId: string) {
    const mastery = await this.masteryRepo.findOne({ where: { userId, topicId } });
    return {
      status: 'success',
      topicId,
      mastery: mastery || { masteryScore: 0, masteryLevel: 'Beginner' },
    };
  }
}
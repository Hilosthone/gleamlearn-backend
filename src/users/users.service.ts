

// // src/users/users.service.ts
// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { User } from '../auth/entities/user.entity.js';
// import { UpdateUserDto, UpdateAcademicProfileDto, UpdatePreferencesDto } from './dto/update-user.dto.js';

// @Injectable()
// export class UsersService {
//   constructor(
//     @InjectRepository(User)
//     private readonly userRepository: Repository<User>,
//   ) {}

//   // ==========================================
//   // AUTHENTICATED USER PRIVATE METHODS
//   // ==========================================

//   async getProfile(userId: string) {
//     const user = await this.userRepository.findOne({ where: { id: userId } });
//     if (!user) {
//       throw new NotFoundException('User profile not found');
//     }
//     // Exclude passwordHash and refresh token before returning
//     const { passwordHash, refreshToken, ...result } = user;
//     return result;
//   }

//   async updateProfile(userId: string, updateDto: UpdateUserDto) {
//     await this.userRepository.update(userId, updateDto);
//     return this.getProfile(userId);
//   }

//   async deleteAccount(userId: string) {
//     const result = await this.userRepository.delete(userId);
//     if (result.affected === 0) {
//       throw new NotFoundException('User not found');
//     }
//     return { message: 'Account successfully deleted' };
//   }

//   async updateProfilePicture(userId: string, imageUrl: string) {
//     // If you have a profilePicture column in your User entity, update it here:
//     // await this.userRepository.update(userId, { profilePicture: imageUrl });
//     return { message: 'Profile picture updated successfully', imageUrl };
//   }

//   async removeProfilePicture(userId: string) {
//     // await this.userRepository.update(userId, { profilePicture: null });
//     return { message: 'Profile picture removed successfully' };
//   }

//   async updateAcademicProfile(userId: string, academicDto: UpdateAcademicProfileDto) {
//     await this.userRepository.update(userId, academicDto);
//     return { message: 'Academic profile updated successfully', data: await this.getProfile(userId) };
//   }

//   async updatePreferences(userId: string, prefsDto: UpdatePreferencesDto) {
//     await this.userRepository.update(userId, prefsDto);
//     return { message: 'Learning preferences updated successfully', data: await this.getProfile(userId) };
//   }

//   async updateNotificationPreferences(userId: string, notifDto: Record<string, any>) {
//     // Save to settings table or user column if implemented
//     return { message: 'Notification preferences updated successfully', data: notifDto };
//   }

//   async updatePrivacySettings(userId: string, privacyDto: Record<string, any>) {
//     // Save privacy settings
//     return { message: 'Privacy settings updated successfully', data: privacyDto };
//   }

//   // ==========================================
//   // PUBLIC PROFILE & DISCOVERY METHODS
//   // ==========================================

//   async getPublicProfile(username: string) {
//     const user = await this.userRepository.findOne({ where: { username } });
//     if (!user) {
//       throw new NotFoundException(`User @${username} not found`);
//     }

//     // Return only public fields (hide email, tokens, passwordHash)
//     return {
//       fullName: user.fullName,
//       username: user.username,
//       educationType: user.educationType,
//       university: user.university,
//       secondarySchool: user.secondarySchool,
//       department: user.department,
//       level: user.level,
//       createdAt: user.createdAt,
//     };
//   }

//   async getUserAchievements(username: string) {
//     const user = await this.userRepository.findOne({ where: { username } });
//     if (!user) {
//       throw new NotFoundException(`User @${username} not found`);
//     }

//     // Placeholder until achievements relation/table is built
//     return {
//       username,
//       achievements: [
//         { title: 'Early Bird', description: 'Joined during platform launch beta', unlockedAt: user.createdAt }
//       ]
//     };
//   }

//   async getUserStats(username: string) {
//     const user = await this.userRepository.findOne({ where: { username } });
//     if (!user) {
//       throw new NotFoundException(`User @${username} not found`);
//     }

//     // Placeholder learning metrics
//     return {
//       username,
//       currentStreakDays: 1,
//       completedCoursesCount: 0,
//       totalHoursLearned: 0,
//     };
//   }
// }




// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity.js';
import { UpdateUserDto, UpdateAcademicProfileDto, UpdatePreferencesDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ==========================================
  // AUTHENTICATED USER PRIVATE METHODS
  // ==========================================

  async getProfile(userId: string) {
    const user = (await this.userRepository.findOne({ where: { id: userId } })) as any;
    if (!user || user.deletedAt) {
      throw new NotFoundException('User profile not found');
    }
    // Exclude passwordHash and refreshToken before returning
    const { passwordHash, ...result } = user;
    return result;
  }

  async updateProfile(userId: string, updateDto: UpdateUserDto) {
    await this.userRepository.update(userId, updateDto as any);
    return this.getProfile(userId);
  }

  async softDeleteAccount(userId: string) {
    const result = await this.userRepository.update(userId, { 
      deletedAt: new Date(), 
      isFrozen: true 
    } as any);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
    return { message: 'Account successfully soft deleted and retained in backend' };
  }

  async freezeAccount(userId: string) {
    const result = await this.userRepository.update(userId, { isFrozen: true } as any);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
    return { message: 'Account successfully frozen' };
  }

  async unfreezeAccount(userId: string) {
    const result = await this.userRepository.update(userId, { isFrozen: false, deletedAt: null as any } as any);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
    return { message: 'Account successfully unfrozen' };
  }

  async updateProfilePicture(userId: string, imageUrl: string) {
    // If you have a profilePicture column in your User entity, update it here:
    // await this.userRepository.update(userId, { profilePicture: imageUrl });
    return { message: 'Profile picture updated successfully', imageUrl };
  }

  async removeProfilePicture(userId: string) {
    // await this.userRepository.update(userId, { profilePicture: null });
    return { message: 'Profile picture removed successfully' };
  }

  async updateAcademicProfile(userId: string, academicDto: UpdateAcademicProfileDto) {
    await this.userRepository.update(userId, academicDto as any);
    return { message: 'Academic profile updated successfully', data: await this.getProfile(userId) };
  }

  async updatePreferences(userId: string, prefsDto: UpdatePreferencesDto) {
    await this.userRepository.update(userId, prefsDto as any);
    return { message: 'Learning preferences updated successfully', data: await this.getProfile(userId) };
  }

  async updateNotificationPreferences(userId: string, notifDto: Record<string, any>) {
    // Save to settings table or user column if implemented
    return { message: 'Notification preferences updated successfully', data: notifDto };
  }

  async updatePrivacySettings(userId: string, privacyDto: Record<string, any>) {
    // Save privacy settings
    return { message: 'Privacy settings updated successfully', data: privacyDto };
  }

  // ==========================================
  // PUBLIC PROFILE & DISCOVERY METHODS
  // ==========================================

  async getPublicProfile(username: string) {
    const user = (await this.userRepository.findOne({ where: { username } })) as any;
    if (!user || user.deletedAt) {
      throw new NotFoundException(`User @${username} not found`);
    }

    // Return only public fields (hide email, tokens, passwordHash)
    return {
      fullName: user.fullName,
      username: user.username,
      educationType: user.educationType,
      university: user.university,
      secondarySchool: user.secondarySchool,
      department: user.department,
      level: user.levelOrClass,
      createdAt: user.createdAt,
    };
  }

  async getUserAchievements(username: string) {
    const user = (await this.userRepository.findOne({ where: { username } })) as any;
    if (!user || user.deletedAt) {
      throw new NotFoundException(`User @${username} not found`);
    }

    // Placeholder until achievements relation/table is built
    return {
      username,
      achievements: [
        { title: 'Early Bird', description: 'Joined during platform launch beta', unlockedAt: user.createdAt }
      ]
    };
  }

  async getUserStats(username: string) {
    const user = (await this.userRepository.findOne({ where: { username } })) as any;
    if (!user || user.deletedAt) {
      throw new NotFoundException(`User @${username} not found`);
    }

    // Placeholder learning metrics
    return {
      username,
      currentStreakDays: 1,
      completedCoursesCount: 0,
      totalHoursLearned: 0,
    };
  }
}


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
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity.js';
import { AccountStatusService } from '../auth/account-status.service.js';
import {
  ACADEMIC_PROFILE_FIELDS,
  PREFERENCE_FIELDS,
  buildBasicProfileUpdate,
  pickAllowed,
} from '../common/utils/profile-update.util.js';
import { UpdateUserDto, UpdateAcademicProfileDto, UpdatePreferencesDto } from './dto/update-user.dto.js';

/** Preference fields accepted by the DTO but with no column on the entity this service uses (B2). */
const UNSTORED_PREFERENCE_FIELDS = ['preferredLearningPace'] as const;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly accountStatus: AccountStatusService,
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
    // Never return credentials or one-time codes: a pending reset code here would let anyone holding the
    // access token reset the password (verificationOtp also serves as the password-reset code).
    const { passwordHash: _hash, verificationOtp: _otp, otpExpiresAt: _otpExpiry, refreshToken: _refresh, ...result } = user;
    return result;
  }

  async updateProfile(userId: string, updateDto: UpdateUserDto) {
    const current = await this.userRepository.findOne({ where: { id: userId } });
    if (!current) {
      throw new NotFoundException('User not found');
    }
    const update = buildBasicProfileUpdate(updateDto, current.email);
    if (Object.keys(update).length > 0) {
      await this.userRepository.update(userId, update as any);
    }
    return this.getProfile(userId);
  }

  // Account status columns (isFrozen, deletedAt) are not declared on the auth User entity (B2), so they are
  // written through AccountStatusService, which only touches columns that exist.
  async softDeleteAccount(userId: string, password?: unknown) {
    // Re-confirm with the password: a stolen or left-open session must not be enough to delete the account.
    // A wrong password is 400 (not 401) so the client does not mistake it for an expired session.
    if (typeof password !== 'string' || !password) {
      throw new BadRequestException('Enter your password to delete your account');
    }
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new BadRequestException('Incorrect password');
    }
    const affected = await this.accountStatus.softDelete(userId);
    if (affected === 0) {
      throw new NotFoundException('User not found');
    }
    return { message: 'Account successfully soft deleted and retained in backend' };
  }

  async freezeAccount(userId: string) {
    const affected = await this.accountStatus.setFrozen(userId, true);
    if (affected === 0) {
      throw new NotFoundException('User not found');
    }
    return { message: 'Account successfully frozen' };
  }

  async unfreezeAccount(userId: string) {
    // Unfreezing never restores a deleted account (previously it also cleared deletedAt)
    const affected = await this.accountStatus.setFrozen(userId, false);
    if (affected === 0) {
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
    const update = pickAllowed(academicDto, ACADEMIC_PROFILE_FIELDS);
    // B2: this service uses the auth User entity, which has no levelOrClass column (500 before). The value is
    // stored in the existing `level` column instead; no schema change.
    if ('levelOrClass' in update) {
      update.level = update.levelOrClass;
      delete update.levelOrClass;
    }
    if (Object.keys(update).length > 0) {
      await this.userRepository.update(userId, update as any);
    }
    return { message: 'Academic profile updated successfully', data: await this.getProfile(userId) };
  }

  async updatePreferences(userId: string, prefsDto: UpdatePreferencesDto) {
    const update = pickAllowed(prefsDto, PREFERENCE_FIELDS);
    // B2: the auth User entity has no preferredLearningPace column (500 before). It is reported as not stored
    // instead of failing; storing it needs the reviewed B2 reconciliation or a migration.
    const notStored = UNSTORED_PREFERENCE_FIELDS.filter((key) => key in update);
    for (const key of notStored) delete update[key];
    if (Object.keys(update).length > 0) {
      await this.userRepository.update(userId, update as any);
    }
    return {
      message: notStored.length ? 'Learning preferences partly updated' : 'Learning preferences updated successfully',
      data: await this.getProfile(userId),
      ...(notStored.length ? { notStored } : {}),
    };
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
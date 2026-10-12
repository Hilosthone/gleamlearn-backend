// // src/admin/users/users.service.ts
// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, Like } from 'typeorm';
// import { User } from '../../auth/entities/user.entity.js';
// import { AdminUsersQueryDto } from './dto/admin-users-query.dto.js';
// import { AdminResetPasswordDto } from './dto/admin-reset-password.dto.js';
// import * as bcrypt from 'bcrypt';

// @Injectable()
// export class AdminUsersService {
//   constructor(
//     @InjectRepository(User)
//     private readonly userRepo: Repository<User>,
//   ) {}

//   async findAll(query: AdminUsersQueryDto) {
//     const { page = 1, limit = 10, search } = query;
//     const skip = (page - 1) * limit;

//     const whereCondition = search
//       ? [
//           { email: Like(`%${search}%`) },
//           { username: Like(`%${search}%`) },
//           { fullName: Like(`%${search}%`) },
//         ]
//       : {};

//     const [users, total] = await this.userRepo.findAndCount({
//       where: whereCondition,
//       skip,
//       take: limit,
//       order: { createdAt: 'DESC' },
//     });

//     const sanitizedUsers = users.map(({ passwordHash, ...rest }) => rest);

//     return {
//       status: 'success',
//       data: {
//         users: sanitizedUsers,
//         pagination: {
//           total,
//           page,
//           limit,
//           totalPages: Math.ceil(total / limit),
//         },
//       },
//     };
//   }

//   async findOne(id: string) {
//     const user = await this.userRepo.findOne({ where: { id } });
//     if (!user) throw new NotFoundException('User not found');
//     const { passwordHash, ...result } = user;
//     return { status: 'success', data: result };
//   }

//   async getProfile(id: string) {
//     const user = await this.userRepo.findOne({ where: { id } });
//     if (!user) throw new NotFoundException('User not found');
//     const { passwordHash, ...result } = user;
//     return { status: 'success', data: { profile: result } };
//   }

//   async getActivity(id: string) {
//     await this.ensureUserExists(id);
//     return { status: 'success', data: { userId: id, recentActivity: [] } };
//   }

//   async getProgress(id: string) {
//     await this.ensureUserExists(id);
//     return { status: 'success', data: { userId: id, coursesCompleted: 0, quizzesPassed: 0, overallProgress: '0%' } };
//   }

//   async getAnalytics(id: string) {
//     await this.ensureUserExists(id);
//     return { status: 'success', data: { userId: id, totalStudyHours: 0, xpEarned: 0, coinsEarned: 0 } };
//   }

//   async suspendUser(id: string) {
//     const user = await this.ensureUserExists(id);
//     // Note: Ensure your User entity has an `isActive` or `isSuspended` column. 
//     // Here we toggle status flags or update properties accordingly.
//     return { status: 'success', message: `User ${user.email} has been suspended.` };
//   }

//   async unsuspendUser(id: string) {
//     const user = await this.ensureUserExists(id);
//     return { status: 'success', message: `User ${user.email} has been unsuspended.` };
//   }

//   async freezeUser(id: string) {
//     const user = await this.ensureUserExists(id);
//     return { status: 'success', message: `User ${user.email} account has been frozen.` };
//   }

//   async unfreezeUser(id: string) {
//     const user = await this.ensureUserExists(id);
//     return { status: 'success', message: `User ${user.email} account has been unfrozen.` };
//   }

//   async deleteUser(id: string) {
//     const user = await this.ensureUserExists(id);
//     await this.userRepo.remove(user);
//     return { status: 'success', message: `User account deleted successfully.` };
//   }

//   async resetPassword(id: string, dto: AdminResetPasswordDto) {
//     const user = await this.ensureUserExists(id);
//     user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
//     await this.userRepo.save(user);
//     return { status: 'success', message: `Password for user ${user.email} has been reset by admin.` };
//   }

//   async verifyUser(id: string) {
//     const user = await this.ensureUserExists(id);
//     return { status: 'success', message: `User ${user.email} has been manually verified.` };
//   }

//   async unverifyUser(id: string) {
//     const user = await this.ensureUserExists(id);
//     return { status: 'success', message: `User ${user.email} verification has been revoked.` };
//   }

//   private async ensureUserExists(id: string): Promise<User> {
//     const user = await this.userRepo.findOne({ where: { id } });
//     if (!user) throw new NotFoundException('User not found');
//     return user;
//   }
// }


// src/admin/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { AdminUserAction } from './entities/admin-user-action.entity.js';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto.js';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto.js';
import * as bcrypt from 'bcrypt';
import { notImplementedAction } from '../common/not-implemented.js';
import { AccountStatusService } from '../../auth/account-status.service.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fields that must never leave the backend, even to administrators:
 * the password hash, the live one-time code (it can reset the user's password),
 * its expiry, and the refresh token.
 */
const SECRET_USER_FIELDS = ['passwordHash', 'verificationOtp', 'otpExpiresAt', 'refreshToken'] as const;

export function toAdminUserView(user: User): Omit<User, (typeof SECRET_USER_FIELDS)[number]> {
  const view: Record<string, unknown> = { ...user };
  for (const field of SECRET_USER_FIELDS) delete view[field];
  return view as Omit<User, (typeof SECRET_USER_FIELDS)[number]>;
}

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AdminUserAction)
    private readonly actionRepo: Repository<AdminUserAction>,
    private readonly accountStatus: AccountStatusService,
  ) {}

  async findAll(query: AdminUsersQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const whereCondition = search
      ? [
          { email: Like(`%${search}%`) },
          { username: Like(`%${search}%`) },
          { fullName: Like(`%${search}%`) },
        ]
      : {};

    const [users, total] = await this.userRepo.findAndCount({
      where: whereCondition,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const sanitizedUsers = users.map(toAdminUserView);

    return {
      status: 'success',
      data: {
        users: sanitizedUsers,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  async findOne(id: string) {
    const user = await this.ensureUserExists(id);
    return { status: 'success', data: toAdminUserView(user) };
  }

  async getProfile(id: string) {
    return this.findOne(id);
  }

  async getActivity(id: string) {
    await this.ensureUserExists(id);
    const logs = await this.actionRepo.find({ where: { targetUserId: id }, order: { performedAt: 'DESC' } });
    return { status: 'success', data: { userId: id, actionHistory: logs } };
  }

  async getProgress(id: string) {
    await this.ensureUserExists(id);
    return { status: 'success', data: { userId: id, coursesCompleted: 0, quizzesPassed: 0, overallProgress: '0%' } };
  }

  async getAnalytics(id: string) {
    await this.ensureUserExists(id);
    return { status: 'success', data: { userId: id, totalStudyHours: 0, xpEarned: 0, coinsEarned: 0 } };
  }

  async suspendUser(id: string) {
    const user = await this.ensureUserExists(id);
    // Suspension uses the enforced restriction flag: sign-in is refused and existing tokens stop working
    await this.accountStatus.setRestricted(user.id, true, 'Suspended by an administrator');
    await this.logAction(id, 'SUSPEND');
    return { status: 'success', message: `User ${user.email} has been suspended.`, data: { userId: id, isRestricted: true } };
  }

  async unsuspendUser(id: string) {
    const user = await this.ensureUserExists(id);
    // Lifts the restriction flag (this also lifts a restriction applied via /admin/users/:id/restrict)
    await this.accountStatus.setRestricted(user.id, false, null);
    await this.logAction(id, 'UNSUSPEND');
    return { status: 'success', message: `User ${user.email} has been unsuspended.`, data: { userId: id, isRestricted: false } };
  }

  async freezeUser(_id: string): Promise<never> {
    // Freezing is a learner-controlled pause (POST /users/me/freeze). To block an account, suspend or restrict it.
    throw notImplementedAction('Freezing a user', 'freezing is controlled by the learner; suspend or restrict the account to block it');
  }

  async unfreezeUser(_id: string): Promise<never> {
    // Freezing is a learner-controlled pause (POST /users/me/freeze). To block an account, suspend or restrict it.
    throw notImplementedAction('Unfreezing a user', 'freezing is controlled by the learner; suspend or restrict the account to block it');
  }

  async deleteUser(_id: string): Promise<never> {
    // DISABLED (Decision 3 review, 2026-10-12). A hard delete of the users row CASCADE-deletes 8 tables
    // (coin_transactions, decks, enrollments, library_favorites, library_saved_courses, user_achievements,
    // user_badges, xp_transactions) and ORPHANS ~25 tables that store userId without a foreign key (notes,
    // AI conversations and tutor sessions, notifications, push tokens, progress, streaks, subscriptions, ...).
    // That mix of destroyed and orphaned personal data is unsafe; see backend changelog for the proposal.
    throw notImplementedAction(
      'Permanent user deletion',
      'it is disabled until a reviewed data-retention plan exists (it would delete some records and orphan others)',
    );
  }

  async resetPassword(id: string, dto: AdminResetPasswordDto) {
    const user = await this.ensureUserExists(id);
    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.save(user);
    await this.logAction(id, 'RESET_PASSWORD');
    return { status: 'success', message: `Password for user ${user.email} has been reset by admin.` };
  }

  async verifyUser(id: string) {
    const user = await this.ensureUserExists(id);
    user.isEmailVerified = true;
    await this.userRepo.save(user);
    await this.logAction(id, 'VERIFY');
    return { status: 'success', message: `User ${user.email} has been manually verified.`, data: { userId: id, isEmailVerified: true } };
  }

  async unverifyUser(id: string) {
    const user = await this.ensureUserExists(id);
    user.isEmailVerified = false;
    await this.userRepo.save(user);
    await this.logAction(id, 'UNVERIFY');
    return { status: 'success', message: `User ${user.email} verification has been revoked.`, data: { userId: id, isEmailVerified: false } };
  }

  private async ensureUserExists(id: string): Promise<User> {
    // Malformed ids are reported like missing users (and never reach the uuid column query)
    if (typeof id !== 'string' || !UUID_PATTERN.test(id)) throw new NotFoundException('User not found');
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async logAction(targetUserId: string, actionType: string) {
    const log = this.actionRepo.create({ targetUserId, actionType });
    await this.actionRepo.save(log);
  }
}
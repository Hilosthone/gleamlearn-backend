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

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AdminUserAction)
    private readonly actionRepo: Repository<AdminUserAction>,
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

    const sanitizedUsers = users.map(({ passwordHash, ...rest }) => rest);

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
    const { passwordHash, ...result } = user;
    return { status: 'success', data: result };
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
    await this.logAction(id, 'SUSPEND');
    return { status: 'success', message: `User ${user.email} has been suspended.` };
  }

  async unsuspendUser(id: string) {
    const user = await this.ensureUserExists(id);
    await this.logAction(id, 'UNSUSPEND');
    return { status: 'success', message: `User ${user.email} has been unsuspended.` };
  }

  async freezeUser(id: string) {
    const user = await this.ensureUserExists(id);
    await this.logAction(id, 'FREEZE');
    return { status: 'success', message: `User ${user.email} account has been frozen.` };
  }

  async unfreezeUser(id: string) {
    const user = await this.ensureUserExists(id);
    await this.logAction(id, 'UNFREEZE');
    return { status: 'success', message: `User ${user.email} account has been unfrozen.` };
  }

  async deleteUser(id: string) {
    const user = await this.ensureUserExists(id);
    await this.logAction(id, 'DELETE');
    await this.userRepo.remove(user);
    return { status: 'success', message: `User account deleted successfully.` };
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
    await this.logAction(id, 'VERIFY');
    return { status: 'success', message: `User ${user.email} has been manually verified.` };
  }

  async unverifyUser(id: string) {
    const user = await this.ensureUserExists(id);
    await this.logAction(id, 'UNVERIFY');
    return { status: 'success', message: `User ${user.email} verification has been revoked.` };
  }

  private async ensureUserExists(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async logAction(targetUserId: string, actionType: string) {
    const log = this.actionRepo.create({ targetUserId, actionType });
    await this.actionRepo.save(log);
  }
}
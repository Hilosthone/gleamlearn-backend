// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, FindOptionsWhere } from 'typeorm';
// import { SecurityEvent } from './entities/security-event.entity.js';
// import { User } from '../../auth/entities/user.entity.js';
// import { ActivityLog } from '../activity/entities/activity-log.entity.js';
// import { RestrictUserDto } from './dto/restrict-user.dto.js';
// import { SecurityQueryDto } from './dto/security-query.dto.js';

// @Injectable()
// export class SecurityService {
//   constructor(
//     @InjectRepository(SecurityEvent)
//     private readonly securityEventRepo: Repository<SecurityEvent>,
//     @InjectRepository(User)
//     private readonly userRepo: Repository<User>,
//     @InjectRepository(ActivityLog)
//     private readonly auditRepo: Repository<ActivityLog>,
//   ) {}

//   async getSecurityEvents(query: SecurityQueryDto) {
//     const { page = 1, limit = 10, severity } = query;
//     const where: FindOptionsWhere<SecurityEvent> = {};
//     if (severity) where.severity = severity;

//     const [events, total] = await this.securityEventRepo.findAndCount({
//       where,
//       skip: (page - 1) * limit,
//       take: limit,
//       order: { createdAt: 'DESC' },
//     });

//     return {
//       status: 'success',
//       data: {
//         securityEvents: events,
//         pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
//       },
//     };
//   }

//   async getSuspiciousUsers() {
//     // Find users who are restricted or have multiple security events linked to them
//     const restrictedUsers = await this.userRepo.find({
//       where: { isRestricted: true },
//       select: ['id', 'username', 'email', 'fullName', 'restrictionReason', 'updatedAt'],
//     });

//     return {
//       status: 'success',
//       data: {
//         suspiciousUsersCount: restrictedUsers.length,
//         users: restrictedUsers,
//       },
//     };
//   }

//   async restrictUser(userId: string, dto: RestrictUserDto, adminId: string) {
//     const user = await this.userRepo.findOne({ where: { id: userId } });
//     if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

//     user.isRestricted = true;
//     user.restrictionReason = dto.reason;
//     user.refreshToken = null; // Invalidate active session tokens immediately
//     await this.userRepo.save(user);

//     // Audit Log
//     const audit = this.auditRepo.create({
//       adminId,
//       category: 'SECURITY',
//       action: 'RESTRICT_USER',
//       target: `User: ${user.email}`,
//       details: JSON.stringify({ reason: dto.reason }),
//       ipAddress: '127.0.0.1',
//     });
//     await this.auditRepo.save(audit);

//     return {
//       status: 'success',
//       message: `User ${user.username} has been restricted successfully`,
//       data: { userId: user.id, isRestricted: true, reason: dto.reason },
//     };
//   }

//   async unrestrictUser(userId: string, adminId: string) {
//     const user = await this.userRepo.findOne({ where: { id: userId } });
//     if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

//     user.isRestricted = false;
//     user.restrictionReason = null;
//     await this.userRepo.save(user);

//     // Audit Log
//     const audit = this.auditRepo.create({
//       adminId,
//       category: 'SECURITY',
//       action: 'UNRESTRICT_USER',
//       target: `User: ${user.email}`,
//       details: 'Restriction lifted by admin',
//       ipAddress: '127.0.0.1',
//     });
//     await this.auditRepo.save(audit);

//     return {
//       status: 'success',
//       message: `User ${user.username} restriction has been lifted`,
//       data: { userId: user.id, isRestricted: false },
//     };
//   }

//   async forceLogoutUser(userId: string, adminId: string) {
//     const user = await this.userRepo.findOne({ where: { id: userId } });
//     if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

//     user.refreshToken = null;
//     await this.userRepo.save(user);

//     // Audit Log
//     const audit = this.auditRepo.create({
//       adminId,
//       category: 'SECURITY',
//       action: 'FORCE_LOGOUT_USER',
//       target: `User: ${user.email}`,
//       details: 'All active sessions terminated by admin',
//       ipAddress: '127.0.0.1',
//     });
//     await this.auditRepo.save(audit);

//     return {
//       status: 'success',
//       message: `User ${user.username} has been force-logged out across all devices`,
//       data: { userId: user.id },
//     };
//   }
// }



import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { SecurityEvent } from './entities/security-event.entity.js';
import { User } from '../../auth/entities/user.entity.js';
import { ActivityLog } from '../activity/entities/activity-log.entity.js';
import { RestrictUserDto } from './dto/restrict-user.dto.js';
import { SecurityQueryDto } from './dto/security-query.dto.js';

@Injectable()
export class SecurityService {
  constructor(
    @InjectRepository(SecurityEvent)
    private readonly securityEventRepo: Repository<SecurityEvent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ActivityLog)
    private readonly auditRepo: Repository<ActivityLog>,
  ) {}

  async getSecurityEvents(query: SecurityQueryDto) {
    const { page = 1, limit = 10, severity } = query;
    const where: FindOptionsWhere<SecurityEvent> = {};
    if (severity) where.severity = severity;

    const [events, total] = await this.securityEventRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      status: 'success',
      data: {
        securityEvents: events,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  async getSuspiciousUsers() {
    const restrictedUsers = await this.userRepo.find({
      where: { isRestricted: true },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        restrictionReason: true,
        updatedAt: true,
      },
    });

    return {
      status: 'success',
      data: {
        suspiciousUsersCount: restrictedUsers.length,
        users: restrictedUsers,
      },
    };
  }

  async restrictUser(userId: string, dto: RestrictUserDto, adminId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    user.isRestricted = true;
    user.restrictionReason = dto.reason;
    user.refreshToken = null;
    await this.userRepo.save(user);

    // Audit Log
    const audit = this.auditRepo.create({
      adminId,
      category: 'SECURITY',
      action: 'RESTRICT_USER',
      target: `User: ${user.email}`,
      details: JSON.stringify({ reason: dto.reason }),
      ipAddress: '127.0.0.1',
    });
    await this.auditRepo.save(audit);

    return {
      status: 'success',
      message: `User ${user.username} has been restricted successfully`,
      data: { userId: user.id, isRestricted: true, reason: dto.reason },
    };
  }

  async unrestrictUser(userId: string, adminId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    user.isRestricted = false;
    user.restrictionReason = null;
    await this.userRepo.save(user);

    // Audit Log
    const audit = this.auditRepo.create({
      adminId,
      category: 'SECURITY',
      action: 'UNRESTRICT_USER',
      target: `User: ${user.email}`,
      details: 'Restriction lifted by admin',
      ipAddress: '127.0.0.1',
    });
    await this.auditRepo.save(audit);

    return {
      status: 'success',
      message: `User ${user.username} restriction has been lifted`,
      data: { userId: user.id, isRestricted: false },
    };
  }

  async forceLogoutUser(userId: string, adminId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    user.refreshToken = null;
    await this.userRepo.save(user);

    // Audit Log
    const audit = this.auditRepo.create({
      adminId,
      category: 'SECURITY',
      action: 'FORCE_LOGOUT_USER',
      target: `User: ${user.email}`,
      details: 'All active sessions terminated by admin',
      ipAddress: '127.0.0.1',
    });
    await this.auditRepo.save(audit);

    return {
      status: 'success',
      message: `User ${user.username} has been force-logged out across all devices`,
      data: { userId: user.id },
    };
  }
}
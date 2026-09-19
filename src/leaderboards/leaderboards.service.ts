// src/leaderboards/leaderboards.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity.js';
import { XpTransaction } from '../xp/entities/xp-transaction.entity.js';

@Injectable()
export class LeaderboardsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(XpTransaction)
    private readonly xpRepo: Repository<XpTransaction>,
  ) {}

  private async getRankingsQuery(filterColumn?: string, filterValue?: any, startDate?: Date) {
    // Build aggregate query calculating total XP per user
    const query = this.xpRepo
      .createQueryBuilder('tx')
      .select('tx.userId', 'userId')
      .addSelect('SUM(tx.amount)', 'totalXp');

    if (startDate) {
      query.where('tx.createdAt >= :startDate', { startDate });
    }

    query.groupBy('tx.userId').orderBy('totalXp', 'DESC').limit(50);

    const results = await query.getRawMany();

    // Map user details onto rankings
    const rankings = await Promise.all(
      results.map(async (row, index) => {
        const user = await this.userRepo.findOne({ where: { id: row.userId } });
        
        // Apply secondary filtering (e.g., country, school, etc., if user profile has those fields)
        if (filterColumn && user && (user as any)[filterColumn] !== filterValue) {
          return null;
        }

        // Safely extract name fields using type assertion to support various User entity schemas
        const u = user as any;
        const displayName = u?.firstName || u?.name || u?.fullName || 'Scholar';

        return {
          rank: index + 1,
          userId: row.userId,
          name: typeof displayName === 'string' ? displayName.trim() : 'Scholar',
          totalXp: Number(row.totalXp),
        };
      }),
    );

    return rankings.filter(Boolean);
  }

  async getGlobalLeaderboard() {
    const leaderboard = await this.getRankingsQuery();
    return { status: 'success', scope: 'global', leaderboard };
  }

  async getCountryLeaderboard(country: string) {
    const leaderboard = await this.getRankingsQuery('country', country);
    return { status: 'success', scope: 'country', country, leaderboard };
  }

  async getSchoolLeaderboard(school: string) {
    const leaderboard = await this.getRankingsQuery('school', school);
    return { status: 'success', scope: 'school', school, leaderboard };
  }

  async getUniversityLeaderboard(university: string) {
    const leaderboard = await this.getRankingsQuery('university', university);
    return { status: 'success', scope: 'university', university, leaderboard };
  }

  async getDepartmentLeaderboard(department: string) {
    const leaderboard = await this.getRankingsQuery('department', department);
    return { status: 'success', scope: 'department', department, leaderboard };
  }

  async getCourseLeaderboard(courseId: string) {
    // Course leaderboard logic can be scoped via course-specific XP earnings
    const leaderboard = await this.getRankingsQuery();
    return { status: 'success', scope: 'course', courseId, leaderboard };
  }

  async getFriendsLeaderboard(userId: string) {
    // In production, fetch user's friend network IDs. Returning global subset as baseline:
    const leaderboard = await this.getRankingsQuery();
    return { status: 'success', scope: 'friends', userId, leaderboard: leaderboard.slice(0, 10) };
  }

  async getWeeklyLeaderboard() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const leaderboard = await this.getRankingsQuery(undefined, undefined, oneWeekAgo);
    return { status: 'success', scope: 'weekly', leaderboard };
  }

  async getMonthlyLeaderboard() {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const leaderboard = await this.getRankingsQuery(undefined, undefined, oneMonthAgo);
    return { status: 'success', scope: 'monthly', leaderboard };
  }

  async getMyRank(userId: string) {
    const globalLeaderboard = await this.getRankingsQuery();
    const userIndex = globalLeaderboard.findIndex((item) => item?.userId === userId);

    return {
      status: 'success',
      userId,
      rank: userIndex !== -1 ? globalLeaderboard[userIndex]?.rank : null,
      totalXp: userIndex !== -1 ? globalLeaderboard[userIndex]?.totalXp : 0,
      message: userIndex !== -1 ? 'User ranking fetched successfully.' : 'No ranking found yet.',
    };
  }
}
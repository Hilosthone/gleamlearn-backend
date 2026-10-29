// src/leaderboards/leaderboards.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity.js';
import { XpTransaction } from '../xp/entities/xp-transaction.entity.js';
import { AccountStatusService } from '../auth/account-status.service.js';
import { Enrollment } from '../courses/entities/enrollment.entity.js';
import { featureUnavailable } from '../common/errors/feature-unavailable.js';

/** Profile field each named leaderboard scope compares against (case-insensitive, trimmed). */
const SCOPE_FIELD = { school: 'secondarySchool', university: 'university', department: 'department' } as const;
type NamedScope = keyof typeof SCOPE_FIELD;
/** profile columns a board may be filtered by (interpolated into SQL, so never caller-supplied) */
const FILTER_COLUMNS = new Set(['country', 'secondarySchool', 'university', 'department']);
const same = (a: unknown, b: unknown) => typeof a === 'string' && typeof b === 'string' && a.trim() !== '' && a.trim().toLowerCase() === b.trim().toLowerCase();

@Injectable()
export class LeaderboardsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(XpTransaction)
    private readonly xpRepo: Repository<XpTransaction>,
    private readonly accountStatus: AccountStatusService,
  ) {}

  private async getRankingsQuery(filterColumn?: string, filterValue?: any, startDate?: Date, onlyUserIds?: Set<string>) {
    // Build aggregate query calculating total XP per user
    const query = this.xpRepo
      .createQueryBuilder('tx')
      .select('tx.userId', 'userId')
      .addSelect('SUM(tx.amount)', 'totalXp');

    if (startDate) {
      query.andWhere('tx.createdAt >= :startDate', { startDate });
    }
    // Filters apply BEFORE the top 50 is taken. They used to be applied afterwards, to the global top 50, so a
    // learner outside it never appeared on their own school, university, department, country or course board.
    if (filterColumn) {
      if (!FILTER_COLUMNS.has(filterColumn)) throw new Error(`Unsupported leaderboard filter ${filterColumn}`);
      if (typeof filterValue !== 'string' || !filterValue.trim()) return [];
      query
        .innerJoin(User, 'u', 'u.id = tx.userId')
        .andWhere(`LOWER(TRIM(u.${filterColumn})) = LOWER(TRIM(:filterValue))`, { filterValue });
    }
    if (onlyUserIds) {
      if (!onlyUserIds.size) return [];
      query.andWhere('tx.userId IN (:...onlyUserIds)', { onlyUserIds: [...onlyUserIds] });
    }

    query.groupBy('tx.userId').orderBy('totalXp', 'DESC').limit(50);

    const results = await query.getRawMany();

    // Map user details onto rankings. Leaderboards are public: accounts that no longer exist, or are deleted or
    // frozen, are left out (they used to appear by full name), and ranks are numbered after filtering (filtered
    // boards used to have gaps).
    const rows = await Promise.all(
      results.map(async (row) => {
        const user = await this.userRepo.findOne({ where: { id: row.userId } });
        if (!user) return null;
        // a scope with a filter only ranks learners whose profile value matches (never everyone)
        if (filterColumn && !same((user as any)[filterColumn], filterValue)) return null;
        if (onlyUserIds && !onlyUserIds.has(user.id)) return null;
        const status = await this.accountStatus.getStatus(user.id);
        if (!status.exists || status.deleted || status.frozen) return null;

        const u = user as any;
        const displayName = u?.firstName || u?.name || u?.fullName || 'Scholar';
        return {
          userId: row.userId,
          name: typeof displayName === 'string' ? displayName.trim() : 'Scholar',
          totalXp: Number(row.totalXp),
        };
      }),
    );

    return rows.filter((r): r is NonNullable<typeof r> => r !== null).map((r, i) => ({ rank: i + 1, ...r }));
  }

  async getGlobalLeaderboard() {
    const leaderboard = await this.getRankingsQuery();
    return { status: 'success', scope: 'global', leaderboard };
  }

  async getCountryLeaderboard(country: string) {
    const leaderboard = await this.getRankingsQuery('country', country);
    return { status: 'success', scope: 'country', country, leaderboard };
  }

  /**
   * School / university / department boards: learners whose profile value matches the name. Without a name, the
   * signed-in learner's own value is used; with neither, the board is empty and says why (it used to list everyone).
   */
  private async namedLeaderboard(scope: NamedScope, name: string | undefined, userId?: string) {
    let value = name?.trim();
    if (!value && userId) value = String(((await this.userRepo.findOne({ where: { id: userId } })) as any)?.[SCOPE_FIELD[scope]] ?? '').trim();
    if (!value) return { status: 'success', scope, [scope]: null, leaderboard: [], message: `Add your ${scope} to your profile to see this leaderboard.` };
    const leaderboard = await this.getRankingsQuery(SCOPE_FIELD[scope], value);
    return { status: 'success', scope, [scope]: value, leaderboard };
  }

  getSchoolLeaderboard(school: string | undefined, userId?: string) {
    return this.namedLeaderboard('school', school, userId);
  }

  getUniversityLeaderboard(university: string | undefined, userId?: string) {
    return this.namedLeaderboard('university', university, userId);
  }

  getDepartmentLeaderboard(department: string | undefined, userId?: string) {
    return this.namedLeaderboard('department', department, userId);
  }

  /** Learners enrolled in the course, ranked by XP (it used to return the global board). */
  async getCourseLeaderboard(courseId: string) {
    if (!courseId?.trim()) return { status: 'success', scope: 'course', courseId: null, leaderboard: [], message: 'Choose a course.' };
    const enrolled = await this.userRepo.manager.getRepository(Enrollment).find({ where: { courseId }, select: { userId: true } });
    const leaderboard = enrolled.length ? await this.getRankingsQuery(undefined, undefined, undefined, new Set(enrolled.map((e) => e.userId))) : [];
    return { status: 'success', scope: 'course', courseId, leaderboard };
  }

  /** There are no friend connections in GleamLearn, so there is no friends board (it used to return the global top 10). */
  async getFriendsLeaderboard(_userId: string): Promise<never> {
    throw featureUnavailable('Friends leaderboard', 'there are no friend connections yet');
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
import { AnalyticsService } from './analytics/analytics.service.js';
import { FinanceService } from './finance/finance.service.js';
import { SystemService } from './system/system.service.js';
import { DashboardService } from './dashboard/dashboard.service.js';
import { GamificationService } from './gamification/gamification.service.js';

/** These admin endpoints used to return invented figures (platform score 88.5, $145,250 revenue, 1,450,000 XP, ...). */
const expect501 = async (p: Promise<unknown>, feature: string) => {
  const err = await p.then(() => null, (e) => e);
  expect(err?.getResponse?.()).toMatchObject({ statusCode: 501, code: 'FEATURE_UNAVAILABLE', feature });
};

describe('admin metrics are real or honestly unavailable', () => {
  it('analytics, finance, system metrics and invented dashboard metrics answer 501', async () => {
    const a = new AnalyticsService({} as never);
    for (const m of ['getOverviewAnalytics', 'getStudentsAnalytics', 'getRetentionAnalytics', 'getStreaksAnalytics'] as const) await expect501(a[m]({} as never), 'Admin analytics');
    const f = new FinanceService({} as never);
    await expect501(f.getOverview(), 'Finance');
    await expect501(f.getTransactions({} as never), 'Finance');
    const s = new SystemService({ isInitialized: true } as never);
    await expect501(s.getQueues(), 'Queue metrics');
    await expect501(s.getStorage(), 'Storage metrics');
    expect((await s.getHealth()).data.database.connected).toBe(true); // health stays real
    const d = new DashboardService({ count: vi.fn(async () => 7) } as never, {} as never, {} as never);
    await expect501(d.getEngagementMetrics(), 'Engagement metrics');
    await expect501(d.getActivityMetrics(), 'Activity metrics');
    const users = await d.getUsersMetrics();
    expect(users.data).toMatchObject({ totalUsers: 7, dailyActiveUsers: null, monthlyActiveUsers: null });
  });

  it('gamification overviews come from the XP, coin and streak tables', async () => {
    const xp = { query: vi.fn(async (sql: string) => (/LIMIT 1/.test(sql) ? [{ userId: 'u1', email: 'a@x.test', xp: '120' }] : [{ total: '300', earners: 3 }])) };
    const coins = { query: vi.fn(async () => [{ earned: '50', spent: '20' }]) };
    const streaks = { query: vi.fn(async () => [{ active: 0, longest_active: 0, avg_active: null, longest_ever: 9 }]) };
    const g = new GamificationService({} as never, xp as never, coins as never, streaks as never, {} as never);
    expect((await g.getXpOverview()).data).toEqual({ totalXpGenerated: 300, learnersWithXp: 3, averageXpPerEarner: 100, topXpEarner: { userId: 'u1', email: 'a@x.test', xp: 120 } });
    expect((await g.getCoinsOverview()).data).toEqual({ totalCoinsEarned: 50, totalCoinsSpent: 20, totalCoinsCirculating: 30 });
    expect((await g.getStreaksOverview()).data).toEqual({ activeStreaksCount: 0, longestActiveStreak: null, averageActiveStreakDays: null, longestStreakEver: 9 });
  });
});

import { NotificationsService } from './notifications/notifications.service.js';
import { SubscriptionsService } from './subscriptions/subscriptions.service.js';

describe('admin actions that used to claim success without effect', () => {
  it('a notification is delivered into the learner notifications, and the delivered count is reported', async () => {
    const manager = { query: vi.fn(async (sql: string) => (/WHERE u.id = \$1/.test(sql) ? [{ id: 'n1' }] : [{ id: 'a' }, { id: 'b' }])) };
    const repo = { manager, create: vi.fn((x: any) => x), save: vi.fn(async (x: any) => ({ id: 'h1', ...x })) };
    const s = new NotificationsService(repo as never);
    const one = await s.sendNotification({ userId: 'u1', title: 'Hi', message: 'Exam tips' } as never, 'admin1');
    expect(manager.query.mock.calls[0][0]).toMatch(/INSERT INTO "notifications"/);
    expect(one.data).toMatchObject({ deliveredCount: 1, targetType: 'SINGLE_USER', senderAdminId: 'admin1' });
    const many = await s.broadcastNotification({ title: 'T', message: 'M', target: 'SPECIFIC_DEPARTMENT', targetId: 'Zoology' } as never, 'admin1');
    expect(many.data.deliveredCount).toBe(2);
    expect(manager.query.mock.calls[1][1]).toEqual(['T', 'M', 'Zoology']);
    await expect(s.broadcastNotification({ title: 'T', message: 'M', target: 'SPECIFIC_DEPARTMENT' } as never, 'a')).rejects.toMatchObject({ status: 400 });
    await expect(s.broadcastNotification({ title: 'T', message: 'M', target: 'PREMIUM_USERS' } as never, 'a')).rejects.toMatchObject({ status: 501 });
    manager.query.mockResolvedValueOnce([]);
    await expect(s.sendNotification({ userId: 'gone', title: 'x', message: 'y' } as never, 'a')).rejects.toMatchObject({ status: 404 });
  });

  it('subscription changes, cancellations and refunds answer 501 (nothing is live behind them)', async () => {
    const s = new SubscriptionsService({} as never);
    await expect501(s.update('x', {} as never), 'Subscription changes');
    await expect501(s.cancel('x'), 'Subscription cancellation');
    await expect501(s.refund('x'), 'Refunds');
  });
});

import { AdminExportService } from './export/admin-export.service.js';

describe('CSV exports', () => {
  it('neutralise cells that a spreadsheet would run as formulas', () => {
    const csv: string = (new AdminExportService({} as never, {} as never) as any).convertToCSV([{ name: '=HYPERLINK("x")', other: '+1', safe: 'Ada' }]);
    expect(csv.split('\n')[1]).toBe(`"'=HYPERLINK(""x"")","'+1","Ada"`);
  });
});

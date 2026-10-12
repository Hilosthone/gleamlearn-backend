import 'reflect-metadata';
import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import request from 'supertest';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy.js';
import { AdminJwtAuthGuard } from './guards/admin-jwt.guard.js';
import { Admin, AdminRole } from './entity/admin.entity.js';
import { ADMIN_PERMISSION_KEY, AdminPermission, ROLE_PERMISSIONS, hasAdminPermission } from './admin-permissions.js';
import { AdminUsersController } from '../users/users.controller.js';
import { AdminUsersService } from '../users/users.service.js';
import { DashboardController } from '../dashboard/dashboard.controller.js';
import { DashboardService } from '../dashboard/dashboard.service.js';
import { CoursesController } from '../courses/courses.controller.js';
import { CoursesService } from '../courses/courses.service.js';
import { SettingsController } from '../settings/settings.controller.js';
import { SettingsService } from '../settings/settings.service.js';
import { RolesController } from '../roles/roles.controller.js';
import { RolesService } from '../roles/roles.service.js';
import { SecurityController } from '../security/security.controller.js';
import { SecurityService } from '../security/security.service.js';
import { AdminExportController } from '../export/admin-export.controller.js';
import { AdminExportService } from '../export/admin-export.service.js';
import { User } from '../../auth/entities/user.entity.js';
import { AdminUserAction } from '../users/entities/admin-user-action.entity.js';

import { ActivityController } from '../activity/activity.controller.js';
import { AiModerationController } from '../ai-moderation/ai-moderation.controller.js';
import { AnalyticsController } from '../analytics/analytics.controller.js';
import { AuditController } from '../audit/audit.controller.js';
import { AdminAuthController } from './admin-auth.controller.js';
import { FinanceController } from '../finance/finance.controller.js';
import { GamificationController } from '../gamification/gamification.controller.js';
import { NotificationsController } from '../notifications/notifications.controller.js';
import { QuestionsController } from '../questions/questions.controller.js';
import { ReportsController } from '../reports/reports.controller.js';
import { SubscriptionsController } from '../subscriptions/subscriptions.controller.js';
import { SystemController } from '../system/system.controller.js';
import { AdminContentController } from '../content/admin-content.controller.js';
import { AccountStatusService } from '../../auth/account-status.service.js';

const ALL_ADMIN_CONTROLLERS = [
  ActivityController, AiModerationController, AnalyticsController, AuditController, AdminAuthController,
  CoursesController, DashboardController, AdminExportController, FinanceController, GamificationController,
  NotificationsController, QuestionsController, ReportsController, RolesController, SecurityController,
  SettingsController, SubscriptionsController, SystemController, AdminUsersController, AdminContentController,
];

const PUBLIC_ADMIN_AUTH_ROUTES = new Set(['login', 'logout', 'refreshToken', 'forgotPassword', 'resetPassword']);

describe('every guarded admin route declares a permission (default deny)', () => {
  it('has a permission on each route protected by AdminJwtAuthGuard', () => {
    const missing: string[] = [];
    let guardedRoutes = 0;
    for (const controller of ALL_ADMIN_CONTROLLERS) {
      const classGuards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, controller) ?? [];
      for (const name of Object.getOwnPropertyNames(controller.prototype)) {
        const handler = controller.prototype[name];
        if (name === 'constructor' || typeof handler !== 'function') continue;
        if (Reflect.getMetadata(METHOD_METADATA, handler) === undefined || Reflect.getMetadata(PATH_METADATA, handler) === undefined) continue;
        const guards: unknown[] = [...classGuards, ...(Reflect.getMetadata(GUARDS_METADATA, handler) ?? [])];
        if (!guards.includes(AdminJwtAuthGuard)) {
          // Only the admin sign-in/out/reset endpoints may be unguarded
          if (!(controller === AdminAuthController && PUBLIC_ADMIN_AUTH_ROUTES.has(name))) missing.push(`${controller.name}.${name} (UNGUARDED)`);
          continue;
        }
        guardedRoutes++;
        const permission = Reflect.getMetadata(ADMIN_PERMISSION_KEY, handler) ?? Reflect.getMetadata(ADMIN_PERMISSION_KEY, controller);
        if (!permission) missing.push(`${controller.name}.${name}`);
      }
    }
    expect(missing).toEqual([]);
    expect(guardedRoutes).toBe(121);
  });

  it('role grants are least-privilege', () => {
    expect(hasAdminPermission(AdminRole.SUPER_ADMIN, AdminPermission.USERS_DELETE)).toBe(true);
    for (const role of Object.values(AdminRole).filter((r) => r !== AdminRole.SUPER_ADMIN)) {
      for (const p of [AdminPermission.USERS_DELETE, AdminPermission.DATA_EXPORT, AdminPermission.SETTINGS_MANAGE, AdminPermission.ROLES_MANAGE]) {
        expect(hasAdminPermission(role, p)).toBe(false);
      }
      expect(hasAdminPermission(role, AdminPermission.SELF)).toBe(true);
    }
    expect(hasAdminPermission('Not A Role', AdminPermission.SELF)).toBe(false);
    expect(hasAdminPermission(undefined, AdminPermission.SELF)).toBe(false);
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual(Object.values(AdminRole).sort());
  });
});

const ADMIN_SECRET = 'admin-secret-for-tests-0123456789abcdef-xyz';
const LEARNER_SECRET = 'learner-secret-for-tests-0123456789abcdef';
const USER_ID = '33333333-3333-4333-8333-333333333333';

describe('HTTP: roles receive 403 for operations they are not granted', () => {
  let app: INestApplication;
  const signer = new JwtService({});
  const admins = new Map<string, any>();
  const target: any = { id: USER_ID, email: 'learner@x.test', isEmailVerified: false, passwordHash: 'h' };
  const userRepo = {
    findOne: vi.fn(async ({ where }: any) => (where.id === USER_ID ? target : null)),
    save: vi.fn(async (u: any) => u),
    remove: vi.fn(async (u: any) => u),
    findAndCount: vi.fn(async () => [[target], 1]),
  };
  const actionRepo = { create: vi.fn((x: any) => x), save: vi.fn(async (x: any) => x), find: vi.fn(async () => []) };
  const dashboard = {
    getOverview: vi.fn(async () => ({ status: 'success', data: {} })),
    getVerifiedCounts: vi.fn(async () => ({ status: 'success', data: { counts: {}, unavailable: [] } })),
  };
  const courses = { create: vi.fn(async () => ({ status: 'success' })), findAll: vi.fn(async () => ({ status: 'success', data: [] })) };
  const settings = { updateSettings: vi.fn(async () => ({ status: 'success' })), getSettings: vi.fn(async () => ({ status: 'success' })) };
  const roles = { createRole: vi.fn(async () => ({ status: 'success' })) };
  const security = { restrictUser: vi.fn(async () => ({ status: 'success' })) };
  const exportSvc = { exportUsers: vi.fn((_f: unknown, res: any) => res.status(200).json({ status: 'success' })) };

  const tokenFor = (role: AdminRole) => {
    const id = `00000000-0000-4000-8000-${String(Object.values(AdminRole).indexOf(role)).padStart(12, '0')}`;
    admins.set(id, { id, email: `${role}@admin.test`, role, isActive: true });
    return signer.sign({ sub: id, email: `${role}@admin.test`, role, type: 'admin' }, { secret: ADMIN_SECRET, expiresIn: '1h' });
  };

  beforeAll(async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const env: Record<string, string> = { ADMIN_JWT_SECRET: ADMIN_SECRET, JWT_SECRET: LEARNER_SECRET };
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
      controllers: [AdminUsersController, DashboardController, CoursesController, SettingsController, RolesController, SecurityController, AdminExportController],
      providers: [
        { provide: AccountStatusService, useValue: { getStatus: vi.fn(async () => ({ exists: true, restricted: false, restrictionReason: null, frozen: false, deleted: false, role: 'student' })), setRestricted: vi.fn(async () => 1), setFrozen: vi.fn(async () => 1), softDelete: vi.fn(async () => 1) } },
        AdminJwtStrategy,
        AdminUsersService,
        { provide: ConfigService, useValue: { get: (k: string) => env[k] } },
        { provide: getRepositoryToken(Admin), useValue: { findOne: vi.fn(async ({ where }: any) => admins.get(where.id) ?? null) } },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(AdminUserAction), useValue: actionRepo },
        { provide: DashboardService, useValue: dashboard },
        { provide: CoursesService, useValue: courses },
        { provide: SettingsService, useValue: settings },
        { provide: RolesService, useValue: roles },
        { provide: SecurityService, useValue: security },
        { provide: AdminExportService, useValue: exportSvc },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    target.isEmailVerified = false;
  });

  const http = () => request(app.getHttpServer());
  const as = (role: AdminRole) => ({ Authorization: `Bearer ${tokenFor(role)}` });

  it.each([AdminRole.ADMIN, AdminRole.MODERATOR, AdminRole.CONTENT_ADMIN, AdminRole.FINANCE_ADMIN, AdminRole.SUPPORT_ADMIN, AdminRole.ANALYST])(
    '%s cannot permanently delete a user (403, nothing removed)',
    async (role) => {
      const res = await http().delete(`/api/v1/admin/users/${USER_ID}`).set(as(role));
      expect(res.status).toBe(403);
      expect(userRepo.remove).not.toHaveBeenCalled();
      expect(actionRepo.save).not.toHaveBeenCalled();
    },
  );

  it('permanent deletion is disabled even for Super Admin (501): nothing is removed or logged', async () => {
    for (const id of [USER_ID, '44444444-4444-4444-8444-444444444444', 'not-a-uuid']) {
      const res = await http().delete(`/api/v1/admin/users/${id}`).set(as(AdminRole.SUPER_ADMIN));
      expect(res.status).toBe(501);
      expect(res.body.message).toMatch(/Permanent user deletion is not available yet/);
    }
    expect(userRepo.remove).not.toHaveBeenCalled();
    expect(actionRepo.save).not.toHaveBeenCalled();
  });

  it.each([
    [AdminRole.CONTENT_ADMIN, 'get', '/api/v1/admin/users'],
    [AdminRole.ANALYST, 'get', '/api/v1/admin/users'],
    [AdminRole.FINANCE_ADMIN, 'get', `/api/v1/admin/users/${USER_ID}`],
    [AdminRole.MODERATOR, 'patch', `/api/v1/admin/users/${USER_ID}/verify`],
    [AdminRole.ANALYST, 'patch', `/api/v1/admin/users/${USER_ID}/verify`],
    [AdminRole.CONTENT_ADMIN, 'get', '/api/v1/admin/dashboard'],
    [AdminRole.SUPPORT_ADMIN, 'get', '/api/v1/admin/dashboard/counts'],
    [AdminRole.SUPPORT_ADMIN, 'get', '/api/v1/admin/dashboard'],
    [AdminRole.ANALYST, 'post', '/api/v1/admin/courses'],
    [AdminRole.SUPPORT_ADMIN, 'post', '/api/v1/admin/courses'],
    [AdminRole.ADMIN, 'patch', '/api/v1/admin/settings'],
    [AdminRole.ADMIN, 'post', '/api/v1/admin/roles'],
    [AdminRole.ADMIN, 'get', '/api/v1/admin/export/users'],
    [AdminRole.MODERATOR, 'post', `/api/v1/admin/users/${USER_ID}/restrict`],
  ] as const)('%s → %s %s is 403 and the service is not called', async (role, method, path) => {
    const res = await (http() as any)[method](path).set(as(role)).send({});
    expect(res.status).toBe(403);
    for (const fn of [userRepo.save, userRepo.remove, dashboard.getOverview, courses.create, settings.updateSettings, roles.createRole, security.restrictUser, exportSvc.exportUsers]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it.each([
    [AdminRole.SUPPORT_ADMIN, 'get', '/api/v1/admin/users'],
    [AdminRole.MODERATOR, 'get', '/api/v1/admin/users'],
    [AdminRole.ANALYST, 'get', '/api/v1/admin/dashboard'],
    [AdminRole.ANALYST, 'get', '/api/v1/admin/dashboard/counts'],
    [AdminRole.FINANCE_ADMIN, 'get', '/api/v1/admin/dashboard'],
    [AdminRole.CONTENT_ADMIN, 'get', '/api/v1/admin/courses'],
    [AdminRole.SUPER_ADMIN, 'patch', '/api/v1/admin/settings'],
    [AdminRole.SUPER_ADMIN, 'get', '/api/v1/admin/export/users'],
  ] as const)('%s → %s %s is allowed', async (role, method, path) => {
    const res = await (http() as any)[method](path).set(as(role)).send({});
    expect(res.status).toBeLessThan(300);
  });

  it('verify/unverify really change isEmailVerified (Support Admin)', async () => {
    const res = await http().patch(`/api/v1/admin/users/${USER_ID}/verify`).set(as(AdminRole.SUPPORT_ADMIN));
    expect(res.status).toBe(200);
    expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: USER_ID, isEmailVerified: true }));
    expect(res.body.data).toEqual({ userId: USER_ID, isEmailVerified: true });
    const off = await http().patch(`/api/v1/admin/users/${USER_ID}/unverify`).set(as(AdminRole.SUPPORT_ADMIN));
    expect(off.body.data.isEmailVerified).toBe(false);
  });

  it('suspend/unsuspend set the enforced restriction flag and are logged', async () => {
    const res = await http().patch(`/api/v1/admin/users/${USER_ID}/suspend`).set(as(AdminRole.SUPPORT_ADMIN));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ userId: USER_ID, isRestricted: true });
    expect(actionRepo.save).toHaveBeenCalledWith(expect.objectContaining({ actionType: 'SUSPEND' }));
    const off = await http().patch(`/api/v1/admin/users/${USER_ID}/unsuspend`).set(as(AdminRole.SUPPORT_ADMIN));
    expect(off.body.data.isRestricted).toBe(false);
  });

  it('suspend is forbidden for roles without users.manage', async () => {
    const res = await http().patch(`/api/v1/admin/users/${USER_ID}/suspend`).set(as(AdminRole.ANALYST));
    expect(res.status).toBe(403);
    expect(actionRepo.save).not.toHaveBeenCalled();
  });

  it.each(['freeze', 'unfreeze'])('%s returns 501 and changes nothing (no fake success, no log)', async (action) => {
    const res = await http().patch(`/api/v1/admin/users/${USER_ID}/${action}`).set(as(AdminRole.SUPER_ADMIN));
    expect(res.status).toBe(501);
    expect(res.body.message).toMatch(/not available yet/);
    expect(userRepo.save).not.toHaveBeenCalled();
    expect(actionRepo.save).not.toHaveBeenCalled();
  });

  it('learner tokens are rejected (401) on admin routes even for a Super-Admin-shaped payload', async () => {
    const forged = signer.sign({ sub: 'x', role: 'Super Admin', type: 'admin' }, { secret: LEARNER_SECRET, expiresIn: '1h' });
    expect((await http().get('/api/v1/admin/users').set('Authorization', `Bearer ${forged}`)).status).toBe(401);
  });
});

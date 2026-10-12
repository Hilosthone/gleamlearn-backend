import { Controller, Get, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { AccountStatusService } from '../../auth/account-status.service.js';
import { User } from '../../auth/entities/user.entity.js';
import { requireLearnerJwtSecret } from '../../auth/learner-jwt.config.js';
import { XpController } from '../../xp/xp.controller.js';
import { XpService } from '../../xp/xp.service.js';
import { AdminJwtStrategy } from '../../admin/auth/strategies/admin-jwt.strategy.js';
import { Admin, AdminRole } from '../../admin/auth/entity/admin.entity.js';
import { AdminAuthService } from '../../admin/auth/admin-auth.service.js';

const LEARNER_SECRET = 'learner-secret-for-tests-0123456789abcdef';
const ADMIN_SECRET = 'admin-secret-for-tests-0123456789abcdef-xyz';
const OLD_PUBLIC_FALLBACK = 'super-secret-jwt-key';
const USER_ID = '88888888-8888-4888-8888-888888888888';
const active = { exists: true, restricted: false, restrictionReason: null, frozen: false, deleted: false, role: 'student' };

@UseGuards(JwtAuthGuard)
@Controller('api/v1/probe')
class ProbeController {
  @Get() ok() { return { ok: true }; }
}

async function buildApp(env: Record<string, string | undefined>) {
  const admins = new Map<string, any>();
  const xp = { getUserXpSummary: vi.fn(async () => ({})), getXpHistory: vi.fn(async () => []), awardXp: vi.fn(async () => ({ id: 'tx' })) };
  const moduleRef = await Test.createTestingModule({
    imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
    controllers: [ProbeController, XpController],
    providers: [
      JwtStrategy,
      AdminJwtStrategy,
      { provide: XpService, useValue: xp },
      { provide: AccountStatusService, useValue: { getStatus: vi.fn(async () => active) } },
      { provide: ConfigService, useValue: { get: (k: string) => env[k] } },
      { provide: getRepositoryToken(User), useValue: { findOne: vi.fn(async () => ({ id: USER_ID, email: 'l@example.test' })) } },
      { provide: getRepositoryToken(Admin), useValue: { findOne: vi.fn(async ({ where }: any) => admins.get(where.id) ?? null) } },
    ],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  const adminToken = (role: AdminRole) => {
    const id = `00000000-0000-4000-8000-${String(Object.values(AdminRole).indexOf(role)).padStart(12, '0')}`;
    admins.set(id, { id, role, isActive: true });
    return new JwtService({}).sign({ sub: id, role, type: 'admin' }, { secret: ADMIN_SECRET, expiresIn: '1h' });
  };
  return { app, xp, adminToken };
}

const learnerToken = (secret: string) => new JwtService({}).sign({ sub: USER_ID, type: 'learner' }, { secret, expiresIn: '1h' });

describe('no hard-coded fallback secrets', () => {
  it('with JWT_SECRET missing, a token signed with the old public fallback secret is rejected (401)', async () => {
    const { app } = await buildApp({ ADMIN_JWT_SECRET: ADMIN_SECRET });
    const res = await request(app.getHttpServer()).get('/api/v1/probe').set('Authorization', `Bearer ${learnerToken(OLD_PUBLIC_FALLBACK)}`);
    expect(res.status).toBe(401);
    await app.close();
  });

  it('with JWT_SECRET set, only tokens signed with it are accepted', async () => {
    const { app } = await buildApp({ JWT_SECRET: LEARNER_SECRET, ADMIN_JWT_SECRET: ADMIN_SECRET });
    const http = request(app.getHttpServer());
    expect((await http.get('/api/v1/probe').set('Authorization', `Bearer ${learnerToken(LEARNER_SECRET)}`)).status).toBe(200);
    expect((await http.get('/api/v1/probe').set('Authorization', `Bearer ${learnerToken(OLD_PUBLIC_FALLBACK)}`)).status).toBe(401);
    await app.close();
  });

  it('signing a learner token without JWT_SECRET fails closed with 503', () => {
    expect(() => requireLearnerJwtSecret(() => undefined)).toThrow(ServiceUnavailableException);
    expect(() => requireLearnerJwtSecret(() => '   ')).toThrow(ServiceUnavailableException);
    expect(requireLearnerJwtSecret(() => 'x'.repeat(40))).toHaveLength(40);
  });

  it('the Super Admin is NOT seeded with a default password when SUPER_ADMIN_* is unset', async () => {
    const saved = { e: process.env.SUPER_ADMIN_EMAIL, p: process.env.SUPER_ADMIN_PASSWORD };
    delete process.env.SUPER_ADMIN_EMAIL;
    delete process.env.SUPER_ADMIN_PASSWORD;
    const repo = { findOne: vi.fn(), create: vi.fn(), save: vi.fn() };
    const service = Object.create(AdminAuthService.prototype);
    service.adminRepo = repo;
    service.configService = { get: () => undefined };
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await service.onModuleInit();
    expect(repo.save).not.toHaveBeenCalled();
    if (saved.e !== undefined) process.env.SUPER_ADMIN_EMAIL = saved.e;
    if (saved.p !== undefined) process.env.SUPER_ADMIN_PASSWORD = saved.p;
  });
});

describe('POST /api/v1/xp/award is admin-only (users.manage)', () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;
  beforeAll(async () => {
    ctx = await buildApp({ JWT_SECRET: LEARNER_SECRET, ADMIN_JWT_SECRET: ADMIN_SECRET });
  });
  afterAll(async () => ctx.app.close());
  beforeEach(() => ctx.xp.awardXp.mockClear());

  const award = (token?: string) => {
    const req = request(ctx.app.getHttpServer()).post('/api/v1/xp/award');
    return (token ? req.set('Authorization', `Bearer ${token}`) : req).send({ userId: USER_ID, amount: 1000000, source: 'SELF_GRANT' });
  };

  it('learner token → 401 and no XP is granted (previously any learner could grant XP to anyone)', async () => {
    expect((await award(learnerToken(LEARNER_SECRET))).status).toBe(401);
    expect(ctx.xp.awardXp).not.toHaveBeenCalled();
  });

  it('no token → 401', async () => {
    expect((await award()).status).toBe(401);
  });

  it('admin without users.manage (Analyst) → 403', async () => {
    expect((await award(ctx.adminToken(AdminRole.ANALYST))).status).toBe(403);
    expect(ctx.xp.awardXp).not.toHaveBeenCalled();
  });

  it('Support Admin (users.manage) → 2xx', async () => {
    expect((await award(ctx.adminToken(AdminRole.SUPPORT_ADMIN))).status).toBeLessThan(300);
    expect(ctx.xp.awardXp).toHaveBeenCalledTimes(1);
  });

  it('learner XP reads still work with a learner token', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api/v1/xp').set('Authorization', `Bearer ${learnerToken(LEARNER_SECRET)}`);
    expect(res.status).toBe(200);
  });
});

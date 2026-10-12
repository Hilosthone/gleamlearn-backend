import { Controller, Get, INestApplication, Logger, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { User } from '../../auth/entities/user.entity.js';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy.js';
import { AdminJwtAuthGuard } from './guards/admin-jwt.guard.js';
import { Admin } from './entity/admin.entity.js';
import { AdminAuthController } from './admin-auth.controller.js';
import { AdminAuthService } from './admin-auth.service.js';
import { AdminExportController } from '../export/admin-export.controller.js';
import { AdminExportService } from '../export/admin-export.service.js';

const LEARNER_SECRET = 'learner-secret-for-tests-0123456789abcdef';
const ADMIN_SECRET = 'admin-secret-for-tests-0123456789abcdef-xyz';
const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_EMAIL = 'admin@gleamlearn.test';

@Controller('probe')
class ProbeController {
  @UseGuards(JwtAuthGuard)
  @Get('learner')
  learner() {
    return { ok: 'learner' };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('admin')
  admin() {
    return { ok: 'admin' };
  }
}

describe('Admin token separation and admin password-reset hardening', () => {
  let app: INestApplication;
  const env: Record<string, string | undefined> = {};
  const signer = new JwtService({});
  // Initialised before app.init(): AdminAuthService.onModuleInit seeds the super admin through adminRepo
  let admin: any = { id: ADMIN_ID, email: ADMIN_EMAIL, role: 'Super Admin', isActive: true, passwordHash: 'original-hash' };
  const adminRepo = {
    findOne: vi.fn(async ({ where }: any) => {
      if (where.id && where.id === admin.id) return admin;
      if (where.email && where.email === admin.email) return admin;
      return null;
    }),
    save: vi.fn(async (a: any) => a),
    create: vi.fn((a: any) => a),
  };
  const userRepo = {
    findOne: vi.fn(async ({ where }: any) => (where.id === USER_ID ? { id: USER_ID, email: 'learner@x.test', username: 'ada' } : null)),
  };

  const sign = (payload: object, secret: string, options: object = {}) => signer.sign(payload, { secret, expiresIn: '1h', ...options });
  const learnerToken = (extra: object = {}) => sign({ sub: USER_ID, email: ADMIN_EMAIL, username: 'ada', type: 'learner', ...extra }, LEARNER_SECRET);
  const adminToken = (extra: object = {}) => sign({ sub: ADMIN_ID, email: ADMIN_EMAIL, role: 'Super Admin', type: 'admin', ...extra }, ADMIN_SECRET);
  const resetToken = (extra: object = {}, secret = ADMIN_SECRET, options: object = {}) =>
    sign({ sub: ADMIN_ID, email: ADMIN_EMAIL, type: 'admin_password_reset', ...extra }, secret, options);

  beforeAll(async () => {
    env.JWT_SECRET = LEARNER_SECRET;
    env.ADMIN_JWT_SECRET = ADMIN_SECRET;
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
      controllers: [ProbeController, AdminAuthController, AdminExportController],
      providers: [
        JwtStrategy,
        AdminJwtStrategy,
        AdminAuthService,
        { provide: ConfigService, useValue: { get: (key: string) => env[key] } },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Admin), useValue: adminRepo },
        {
          provide: AdminExportService,
          useValue: { exportUsers: vi.fn((_f: unknown, res: any) => res.status(200).json({ status: 'success', data: [] })) },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    env.JWT_SECRET = LEARNER_SECRET;
    env.ADMIN_JWT_SECRET = ADMIN_SECRET;
    admin = { id: ADMIN_ID, email: ADMIN_EMAIL, role: 'Super Admin', isActive: true, passwordHash: 'original-hash' };
    adminRepo.save.mockClear();
  });

  const http = () => request(app.getHttpServer());
  const reset = (token: unknown) =>
    http().post('/api/v1/admin/auth/reset-password').send({ token, newPassword: 'NewAdminPass1!', confirmNewPassword: 'NewAdminPass1!' });

  describe('POST /admin/auth/reset-password', () => {
    it.each([
      ['a learner access token carrying the admin email (the reported attack)', () => learnerToken()],
      ['a learner-typed token signed with the admin secret', () => sign({ sub: ADMIN_ID, email: ADMIN_EMAIL, type: 'learner' }, ADMIN_SECRET)],
      ['an admin ACCESS token', () => adminToken()],
      ['a reset-typed token signed with the learner secret', () => resetToken({}, LEARNER_SECRET)],
      ['a reset token whose subject is not an admin', () => resetToken({ sub: USER_ID })],
      ['a reset token whose email does not match the admin', () => resetToken({ email: 'attacker@evil.test' })],
      ['a reset token without a subject', () => resetToken({ sub: undefined })],
      ['an expired reset token', () => resetToken({}, ADMIN_SECRET, { expiresIn: -10 })],
      ['a malformed token', () => 'not-a-jwt'],
      ['a token signed with the old hard-coded fallback secret', () => sign({ sub: ADMIN_ID, email: ADMIN_EMAIL, type: 'admin_password_reset' }, 'super-secret-jwt-key')],
      ['a non-string token', () => ({ alg: 'none' })],
    ])('rejects %s and changes nothing', async (_label, makeToken) => {
      const res = await reset(makeToken());
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid or expired password reset token');
      expect(adminRepo.save).not.toHaveBeenCalled();
      expect(admin.passwordHash).toBe('original-hash');
    });

    it('rejects reset for an inactive admin', async () => {
      admin.isActive = false;
      expect((await reset(resetToken())).status).toBe(400);
      expect(adminRepo.save).not.toHaveBeenCalled();
    });

    it('accepts only a correctly typed, admin-signed reset token for that admin (for the future reset flow)', async () => {
      const res = await reset(resetToken());
      expect(res.status).toBe(201);
      expect(adminRepo.save).toHaveBeenCalledTimes(1);
      expect(await bcrypt.compare('NewAdminPass1!', admin.passwordHash)).toBe(true);
    });

    it('is unavailable (503) when ADMIN_JWT_SECRET is not configured', async () => {
      env.ADMIN_JWT_SECRET = undefined;
      expect((await reset(resetToken())).status).toBe(503);
      expect(adminRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('cross-token rejection', () => {
    it('learner token works on learner routes and is rejected on admin routes', async () => {
      expect((await http().get('/probe/learner').set('Authorization', `Bearer ${learnerToken()}`)).status).toBe(200);
      expect((await http().get('/probe/admin').set('Authorization', `Bearer ${learnerToken()}`)).status).toBe(401);
    });

    it('admin token works on admin routes and is rejected on learner routes', async () => {
      expect((await http().get('/probe/admin').set('Authorization', `Bearer ${adminToken()}`)).status).toBe(200);
      expect((await http().get('/probe/learner').set('Authorization', `Bearer ${adminToken()}`)).status).toBe(401);
    });

    it('admin-typed token signed with the learner secret is rejected everywhere', async () => {
      const forged = sign({ sub: ADMIN_ID, type: 'admin' }, LEARNER_SECRET);
      expect((await http().get('/probe/admin').set('Authorization', `Bearer ${forged}`)).status).toBe(401);
      expect((await http().get('/probe/learner').set('Authorization', `Bearer ${forged}`)).status).toBe(401);
    });

    it('reset tokens cannot be used as admin access tokens', async () => {
      expect((await http().get('/probe/admin').set('Authorization', `Bearer ${resetToken()}`)).status).toBe(401);
    });

    it('legacy learner tokens without a type claim are still accepted on learner routes only', async () => {
      const legacy = sign({ sub: USER_ID, email: 'learner@x.test', username: 'ada' }, LEARNER_SECRET);
      expect((await http().get('/probe/learner').set('Authorization', `Bearer ${legacy}`)).status).toBe(200);
      expect((await http().get('/probe/admin').set('Authorization', `Bearer ${legacy}`)).status).toBe(401);
    });

    it('admin access requires an active admin', async () => {
      admin.isActive = false;
      expect((await http().get('/probe/admin').set('Authorization', `Bearer ${adminToken()}`)).status).toBe(401);
    });
  });

  describe('fail-safe configuration', () => {
    it.each([
      ['missing', undefined],
      ['too short', 'short-secret'],
      ['equal to JWT_SECRET', LEARNER_SECRET],
    ])('ADMIN_JWT_SECRET %s → admin routes and login return 503; learner routes keep working', async (_label, value) => {
      env.ADMIN_JWT_SECRET = value;
      expect((await http().get('/probe/admin').set('Authorization', `Bearer ${adminToken()}`)).status).toBe(503);
      expect((await http().post('/api/v1/admin/auth/login').send({ email: ADMIN_EMAIL, password: 'whatever' })).status).toBe(503);
      expect((await http().get('/probe/learner').set('Authorization', `Bearer ${learnerToken()}`)).status).toBe(200);
    });
  });

  describe('existing admin authentication behaviour', () => {
    it('login issues an admin-typed token signed with ADMIN_JWT_SECRET that works with /admin/auth/me', async () => {
      admin.passwordHash = await bcrypt.hash('CorrectHorse1!', 4);
      const login = await http().post('/api/v1/admin/auth/login').send({ email: ADMIN_EMAIL, password: 'CorrectHorse1!' });
      expect(login.status).toBe(201);
      const token = login.body.accessToken as string;
      expect(signer.verify(token, { secret: ADMIN_SECRET })).toMatchObject({ sub: ADMIN_ID, type: 'admin' });
      expect(() => signer.verify(token, { secret: LEARNER_SECRET })).toThrow();
      const me = await http().get('/api/v1/admin/auth/me').set('Authorization', `Bearer ${token}`);
      expect(me.status).toBe(200);
      expect(me.body.data.email).toBe(ADMIN_EMAIL);
      expect(me.body.data.passwordHash).toBeUndefined();
    });

    it('wrong password is rejected with 401', async () => {
      admin.passwordHash = await bcrypt.hash('CorrectHorse1!', 4);
      expect((await http().post('/api/v1/admin/auth/login').send({ email: ADMIN_EMAIL, password: 'nope' })).status).toBe(401);
    });
  });

  describe('GET /admin/export/* (previously unguarded)', () => {
    it('requires an admin token', async () => {
      expect((await http().get('/api/v1/admin/export/users')).status).toBe(401);
      expect((await http().get('/api/v1/admin/export/users').set('Authorization', `Bearer ${learnerToken()}`)).status).toBe(401);
      expect((await http().get('/api/v1/admin/export/users').set('Authorization', `Bearer ${adminToken()}`)).status).toBe(200);
    });
  });
});

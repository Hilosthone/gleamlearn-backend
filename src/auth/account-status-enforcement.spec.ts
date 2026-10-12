import { Controller, Get, INestApplication, Post, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { User } from './entities/user.entity.js';
import { AccountStatusService, type AccountStatus } from './account-status.service.js';
import { AuthService } from './auth.service.js';

const SECRET = 'learner-secret-for-tests-0123456789abcdef';
const USER_ID = '88888888-8888-4888-8888-888888888888';

// Same paths as the real controllers so the frozen-account allowlist is exercised exactly
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
class ProbeController {
  @Get('users/me') me() { return { ok: 'me' }; }
  @Post('users/me/unfreeze') unfreeze() { return { ok: 'unfreeze' }; }
  @Post('auth/logout') logout() { return { ok: 'logout' }; }
  @Get('quizzes') quizzes() { return { ok: 'quizzes' }; }
  @Post('quizzes/generate') generate() { return { ok: 'generate' }; }
}

// Some controllers use AuthGuard('jwt') directly instead of JwtAuthGuard: they must be covered too
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/xp')
class RawGuardController {
  @Get() xp() { return { ok: 'xp' }; }
}

const active: AccountStatus = { exists: true, restricted: false, restrictionReason: null, frozen: false, deleted: false, role: 'student' };

describe('account status enforcement on existing sessions (real JwtStrategy)', () => {
  let app: INestApplication;
  let current: AccountStatus = active;
  const status = { getStatus: vi.fn(async () => current) };
  const token = new JwtService({}).sign({ sub: USER_ID, type: 'learner' }, { secret: SECRET, expiresIn: '1h' });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [ProbeController, RawGuardController],
      providers: [
        JwtStrategy,
        { provide: AccountStatusService, useValue: status },
        { provide: ConfigService, useValue: { get: (k: string) => (k === 'JWT_SECRET' ? SECRET : undefined) } },
        { provide: getRepositoryToken(User), useValue: { findOne: vi.fn(async () => ({ id: USER_ID, email: 'a@x.test', username: 'ada' })) } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });
  afterAll(async () => app.close());

  const call = (method: 'get' | 'post', path: string) =>
    (request(app.getHttpServer()) as any)[method](path).set('Authorization', `Bearer ${token}`);

  const ROUTES: Array<['get' | 'post', string, boolean]> = [
    ['get', '/api/v1/users/me', true],
    ['post', '/api/v1/users/me/unfreeze', true],
    ['post', '/api/v1/auth/logout', true],
    ['get', '/api/v1/quizzes', false],
    ['post', '/api/v1/quizzes/generate', false],
    ['get', '/api/v1/xp', false],
  ];

  it.each(ROUTES)('active account: %s %s → 2xx', async (method, path) => {
    current = active;
    expect((await call(method, path)).status).toBeLessThan(300);
  });

  it.each(ROUTES)('restricted account (existing token): %s %s → 403 ACCOUNT_RESTRICTED', async (method, path) => {
    current = { ...active, restricted: true, restrictionReason: 'Suspended by an administrator' };
    const res = await call(method, path);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_RESTRICTED');
    expect(JSON.stringify(res.body)).not.toContain('Suspended by an administrator');
  });

  it.each(ROUTES)('frozen account: %s %s → allowed only on the unfreeze/profile/logout routes', async (method, path, allowed) => {
    current = { ...active, frozen: true };
    const res = await call(method, path);
    if (allowed) expect(res.status).toBeLessThan(300);
    else {
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ACCOUNT_FROZEN');
    }
  });

  it.each(ROUTES)('deleted account (existing token): %s %s → 401', async (method, path) => {
    current = { ...active, deleted: true };
    expect((await call(method, path)).status).toBe(401);
  });

  it('a user row that no longer exists → 401', async () => {
    current = { ...active, exists: false };
    expect((await call('get', '/api/v1/users/me')).status).toBe(401);
  });

  it('status is re-read on every request (a restriction applied mid-session takes effect immediately)', async () => {
    current = active;
    expect((await call('get', '/api/v1/quizzes')).status).toBe(200);
    current = { ...active, restricted: true };
    expect((await call('get', '/api/v1/quizzes')).status).toBe(403);
    current = active;
    expect((await call('get', '/api/v1/quizzes')).status).toBe(200);
  });
});

describe('sign-in respects account status (AuthService.login)', () => {
  // Sign-in refuses to issue tokens without JWT_SECRET (no hard-coded fallback), so provide one
  const savedSecret = process.env.JWT_SECRET;
  beforeAll(() => { process.env.JWT_SECRET = SECRET; });
  afterAll(() => { if (savedSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = savedSecret; });

  async function build(status: AccountStatus) {
    const user = { id: USER_ID, email: 'a@x.test', username: 'ada', fullName: 'Ada', passwordHash: await bcrypt.hash('Correct1!', 4) };
    const service = Object.create(AuthService.prototype);
    service.userRepository = { findOne: vi.fn(async () => user) };
    service.jwtService = { sign: vi.fn(() => 'signed-token') };
    service.mailService = { sendLoginWelcomeEmail: vi.fn(async () => undefined) };
    service.accountStatus = { getStatus: vi.fn(async () => status) };
    return service;
  }

  it('active → token issued, accountStatus "active"', async () => {
    const res = await (await build(active)).login({ email: 'a@x.test', password: 'Correct1!' });
    expect(res.accessToken).toBe('signed-token');
    expect(res.accountStatus).toBe('active');
  });

  it('frozen → token issued so the learner can unfreeze, accountStatus "frozen"', async () => {
    const res = await (await build({ ...active, frozen: true })).login({ email: 'a@x.test', password: 'Correct1!' });
    expect(res.accountStatus).toBe('frozen');
  });

  it('restricted/suspended → 403, no token', async () => {
    const svc = await build({ ...active, restricted: true });
    await expect(svc.login({ email: 'a@x.test', password: 'Correct1!' })).rejects.toMatchObject({ status: 403 });
    expect(svc.jwtService.sign).not.toHaveBeenCalled();
  });

  it('deleted → the same 401 as wrong credentials, no token', async () => {
    const svc = await build({ ...active, deleted: true });
    await expect(svc.login({ email: 'a@x.test', password: 'Correct1!' })).rejects.toMatchObject({ status: 401, message: 'Invalid email or password' });
    expect(svc.jwtService.sign).not.toHaveBeenCalled();
  });

  it('wrong password is rejected before the account status is revealed', async () => {
    const svc = await build({ ...active, restricted: true });
    await expect(svc.login({ email: 'a@x.test', password: 'Wrong1!' })).rejects.toMatchObject({ status: 401 });
    expect(svc.accountStatus.getStatus).not.toHaveBeenCalled();
  });
});

describe('GET /auth/me reports accountStatus (additive)', () => {
  it.each([
    ['active', active],
    ['frozen', { ...active, frozen: true }],
  ] as const)('%s account → accountStatus "%s", no secrets', async (expected, status) => {
    const service = Object.create(AuthService.prototype);
    service.userRepository = { findOne: vi.fn(async () => ({ id: USER_ID, email: 'a@x.test', passwordHash: 'h', verificationOtp: '123456', otpExpiresAt: new Date() })) };
    service.accountStatus = { getStatus: vi.fn(async () => status) };
    const res = await service.getMe(USER_ID);
    expect(res.accountStatus).toBe(expected);
    expect(res.data).not.toHaveProperty('passwordHash');
    expect(res.data).not.toHaveProperty('verificationOtp');
  });
});

describe('JwtStrategy exposes the learner id under every name controllers read', () => {
  it('returns id, userId and sub with the same value', async () => {
    const strategy = Object.create(JwtStrategy.prototype);
    strategy.accountStatus = { getStatus: vi.fn(async () => active) };
    strategy.userRepository = { findOne: vi.fn(async () => ({ id: USER_ID, email: 'a@x.test', username: 'ada' })) };
    const user = await strategy.validate({ method: 'GET', path: '/api/v1/streak' }, { sub: USER_ID, type: 'learner' });
    expect(user).toMatchObject({ id: USER_ID, userId: USER_ID, sub: USER_ID });
  });
});

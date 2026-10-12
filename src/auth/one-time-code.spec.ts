import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { User } from './entities/user.entity.js';
import { MailService } from '../mail/mail.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AccountStatusService } from './account-status.service.js';
import { MAX_CODE_FAILURES, codesMatch } from './one-time-code.js';

const future = () => new Date(Date.now() + 5 * 60 * 1000);

function setup(users: Array<Partial<User>>) {
  const rows = users.map((u) => ({ ...u }));
  const repo = {
    findOne: vi.fn(async ({ where }: any) => rows.find((r: any) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null),
    save: vi.fn(async (u: any) => u),
  };
  return { rows, repo };
}

async function service(repo: any) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: getRepositoryToken(User), useValue: repo },
      { provide: JwtService, useValue: { sign: vi.fn() } },
      { provide: MailService, useValue: { sendPasswordResetSuccessEmail: vi.fn(async () => undefined) } },
      { provide: NotificationsService, useValue: {} },
      { provide: AccountStatusService, useValue: {} },
    ],
  }).compile();
  return moduleRef.get(AuthService);
}

describe('verification / reset codes are bound to one account', () => {
  const ORIGINAL = process.env.AUTH_CODE_REQUIRES_EMAIL;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.AUTH_CODE_REQUIRES_EMAIL;
    else process.env.AUTH_CODE_REQUIRES_EMAIL = ORIGINAL;
  });

  const reset = (body: object) => ({ newPassword: 'NewPass123!', confirmNewPassword: 'NewPass123!', ...body });

  it('requires email by default (the code alone no longer identifies an account)', async () => {
    const { repo } = setup([{ id: 'a', email: 'a@x.test', verificationOtp: '123456', otpExpiresAt: future() }]);
    const auth = await service(repo);
    await expect(auth.resetPassword(reset({ token: '123456' }))).rejects.toThrow('email is required');
    await expect(auth.verifyEmail({ token: '123456' })).rejects.toThrow('email is required');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("another account's valid code does not work for the named account", async () => {
    const { rows, repo } = setup([
      { id: 'victim', email: 'victim@x.test', verificationOtp: '111111', otpExpiresAt: future(), passwordHash: 'old' },
      { id: 'attacker', email: 'attacker@x.test', verificationOtp: '222222', otpExpiresAt: future(), passwordHash: 'old' },
    ]);
    const auth = await service(repo);
    await expect(auth.resetPassword(reset({ email: 'victim@x.test', token: '222222' }))).rejects.toBeInstanceOf(BadRequestException);
    expect(rows[0].passwordHash).toBe('old');
  });

  it('the right email + code resets the password and consumes the code', async () => {
    const { rows, repo } = setup([{ id: 'a', email: 'a@x.test', verificationOtp: '123456', otpExpiresAt: future(), passwordHash: 'old' }]);
    const auth = await service(repo);
    await expect(auth.resetPassword(reset({ email: 'a@x.test', token: '123456' }))).resolves.toMatchObject({ message: expect.stringMatching(/reset/) });
    expect(rows[0].passwordHash).not.toBe('old');
    expect(rows[0].verificationOtp).toBeNull();
  });

  it(`after ${MAX_CODE_FAILURES} wrong codes the pending code is cleared, so even the right code fails`, async () => {
    const { rows, repo } = setup([{ id: 'a', email: 'a@x.test', verificationOtp: '123456', otpExpiresAt: future(), passwordHash: 'old' }]);
    const auth = await service(repo);
    for (let i = 0; i < MAX_CODE_FAILURES - 1; i++) {
      await expect(auth.resetPassword(reset({ email: 'a@x.test', token: String(900000 + i) }))).rejects.toThrow('Invalid or expired password reset code');
    }
    await expect(auth.resetPassword(reset({ email: 'a@x.test', token: '999999' }))).rejects.toThrow(/Too many incorrect codes/);
    expect(rows[0].verificationOtp).toBeNull();
    await expect(auth.resetPassword(reset({ email: 'a@x.test', token: '123456' }))).rejects.toBeInstanceOf(BadRequestException);
    expect(rows[0].passwordHash).toBe('old');
  });

  it('unknown email and wrong code give the same message (no account enumeration)', async () => {
    const { repo } = setup([{ id: 'a', email: 'a@x.test', verificationOtp: '123456', otpExpiresAt: future() }]);
    const auth = await service(repo);
    const unknown = await auth.verifyEmail({ email: 'nobody@x.test', token: '123456' }).catch((e) => e.message);
    const wrong = await auth.verifyEmail({ email: 'a@x.test', token: '000000' }).catch((e) => e.message);
    expect(unknown).toBe(wrong);
  });

  it('verify-email with email + code verifies the account', async () => {
    const { rows, repo } = setup([{ id: 'a', email: 'a@x.test', verificationOtp: '123456', otpExpiresAt: future(), isEmailVerified: false }]);
    const auth = await service(repo);
    await auth.verifyEmail({ email: 'a@x.test', token: '123456' });
    expect(rows[0].isEmailVerified).toBe(true);
  });

  it('AUTH_CODE_REQUIRES_EMAIL=false restores the legacy code-only lookup (compatibility switch)', async () => {
    process.env.AUTH_CODE_REQUIRES_EMAIL = 'false';
    const { rows, repo } = setup([{ id: 'a', email: 'a@x.test', verificationOtp: '123456', otpExpiresAt: future(), isEmailVerified: false }]);
    const auth = await service(repo);
    await auth.verifyEmail({ token: '123456' });
    expect(rows[0].isEmailVerified).toBe(true);
  });

  it('codesMatch is exact and type-safe', () => {
    expect(codesMatch('123456', '123456')).toBe(true);
    expect(codesMatch('123456', ' 123456 ')).toBe(true);
    expect(codesMatch('123456', '12345')).toBe(false);
    expect(codesMatch(null, '123456')).toBe(false);
    expect(codesMatch('123456', 123456)).toBe(false);
  });
});

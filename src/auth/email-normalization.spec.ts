import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { emailAwareRepo } from '../../test/support/email-aware-repo.js';

const SECRET = 'learner-secret-for-tests-0123456789abcdef';
const PASSWORD = 'Secret-1!';

function build(rows: Array<Record<string, any>>) {
  const service = Object.create(AuthService.prototype);
  service.userRepository = emailAwareRepo(rows);
  service.jwtService = { sign: vi.fn(() => 'signed-token') };
  service.accountStatus = {
    getStatus: vi.fn(async () => ({ exists: true, restricted: false, restrictionReason: null, frozen: false, deleted: false, role: 'student' })),
  };
  service.notificationsService = { createAndPushNotification: vi.fn(async () => undefined) };
  service.mailService = new Proxy({}, { get: () => vi.fn(async () => undefined) });
  service.codeFailures = { recordFailure: () => false, reset: () => undefined };
  return service as AuthService & { userRepository: ReturnType<typeof emailAwareRepo> };
}

describe('email addresses identify accounts case-insensitively', () => {
  const saved = process.env.JWT_SECRET;
  beforeAll(() => {
    process.env.JWT_SECRET = SECRET;
  });
  afterAll(() => {
    if (saved === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = saved;
  });
  beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it('sign-up stores the email trimmed and in lower case', async () => {
    const service = build([]);
    await service.signup({ fullName: 'Ada', username: 'ada', email: '  Ada@Example.COM ', password: PASSWORD, confirmPassword: PASSWORD });
    expect(service.userRepository.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'ada@example.com' }));
  });

  it('sign-up refuses an email that differs only by case from an existing (legacy, capitalised) account', async () => {
    const service = build([{ id: 'legacy', email: 'Ada@Example.com', username: 'someone' }]);
    await expect(
      service.signup({ fullName: 'Ada', username: 'ada2', email: 'ada@example.com', password: PASSWORD, confirmPassword: PASSWORD }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(service.userRepository.save).not.toHaveBeenCalled();
  });

  it('sign-up still refuses a taken username', async () => {
    const service = build([{ id: 'u1', email: 'other@example.com', username: 'ada' }]);
    await expect(
      service.signup({ fullName: 'Ada', username: 'ada', email: 'new@example.com', password: PASSWORD, confirmPassword: PASSWORD }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([
    ['a normalised account, typed with capitals', 'ada@example.com', 'ADA@Example.com'],
    ['a legacy capitalised account, typed in lower case', 'Ada@Example.com', 'ada@example.com'],
  ])('login works for %s', async (_label, stored, typed) => {
    const service = build([{ id: 'u1', email: stored, username: 'ada', fullName: 'Ada', passwordHash: bcrypt.hashSync(PASSWORD, 4), isEmailVerified: true }]);
    const res: any = await service.login({ email: typed, password: PASSWORD });
    expect(res.accessToken).toBe('signed-token');
  });
});

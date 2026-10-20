import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';

/**
 * Regression for the "endless spinner" on sign-up/login: these flows used to await SMTP. With an unreachable
 * SMTP server each request took ~30 s (nodemailer greeting timeout) or ~2 min (connection timeout).
 * Here the mail promise NEVER settles: the auth calls must still resolve.
 */
const SECRET = 'learner-secret-for-tests-0123456789abcdef';
const never = () => new Promise<void>(() => undefined);

function build(user: Record<string, unknown> | null) {
  const service = Object.create(AuthService.prototype);
  const rows: any[] = user ? [{ ...user }] : [];
  service.userRepository = {
    findOne: vi.fn(async ({ where }: any) => rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null),
    create: vi.fn((d: any) => ({ id: 'new-user', ...d })),
    save: vi.fn(async (u: any) => u),
  };
  service.jwtService = { sign: vi.fn(() => 'signed-token') };
  service.accountStatus = { getStatus: vi.fn(async () => ({ exists: true, restricted: false, restrictionReason: null, frozen: false, deleted: false, role: 'student' })) };
  service.notificationsService = { createAndPushNotification: vi.fn(async () => undefined) };
  service.mailService = new Proxy({}, { get: () => vi.fn(never) });
  service.codeFailures = { recordFailure: () => false, reset: () => undefined };
  return service as AuthService;
}

const within = <T>(p: Promise<T>, ms = 1000) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`still pending after ${ms} ms`)), ms))]);

describe('auth responses never wait for email delivery', () => {
  const saved = process.env.JWT_SECRET;
  beforeAll(() => { process.env.JWT_SECRET = SECRET; });
  afterAll(() => { if (saved === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = saved; });
  beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => undefined));

  const signupBody = { fullName: 'Ada', username: 'ada', email: 'a@x.test', password: 'Secret-1!', confirmPassword: 'Secret-1!' };

  it('signup returns within the 3 s budget while the verification email is still pending, and says so', async () => {
    const started = Date.now();
    const res: any = await within(build(null).signup(signupBody), 5000);
    expect(Date.now() - started).toBeLessThan(4500);
    expect(res.accessToken).toBe('signed-token');
    expect(res.verificationEmail).toBe('pending');
    expect(res.message).toMatch(/on its way/);
  });

  it('signup reports "sent" when the email is accepted, and "failed" when SMTP refuses', async () => {
    const ok = build(null) as any;
    ok.mailService = { sendVerificationEmail: vi.fn(async () => undefined) };
    expect((await ok.signup(signupBody)).verificationEmail).toBe('sent');
    const bad = build(null) as any;
    bad.mailService = { sendVerificationEmail: vi.fn(async () => { throw new Error('refused'); }) };
    const res = await bad.signup(signupBody);
    expect(res.verificationEmail).toBe('failed');
    expect(res.message).toMatch(/could not send the verification email/);
    expect(res.accessToken).toBe('signed-token'); // the account exists; the learner can request a new code
  });

  it('login resolves while the login alert email is still pending', async () => {
    const user = { id: 'u1', email: 'a@x.test', fullName: 'Ada', passwordHash: await bcrypt.hash('Secret-1!', 4) };
    const res = await within(build(user).login({ email: 'a@x.test', password: 'Secret-1!' }));
    expect(res.accessToken).toBe('signed-token');
  });

  it('forgot-password and resend-verification resolve while email is pending', async () => {
    const user = { id: 'u1', email: 'a@x.test', fullName: 'Ada', isEmailVerified: false };
    await expect(within(build(user).forgotPassword('a@x.test'))).resolves.toMatchObject({ message: expect.any(String) });
    await expect(within(build(user).resendVerification('a@x.test'), 5000)).resolves.toMatchObject({ verificationEmail: 'pending' });
  });

  it('a failing email send is logged without the code or recipient and does not throw', async () => {
    const service = build(null) as any;
    service.mailService = { sendVerificationEmail: vi.fn(async () => { throw new Error('smtp down'); }) };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await service.signup(signupBody);
    await new Promise((r) => setTimeout(r, 10));
    const logged = warn.mock.calls.flat().join(' ');
    expect(logged).toMatch(/verification email could not be delivered/);
    expect(logged).not.toMatch(/a@x\.test|\d{6}/);
  });
});
